import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile, unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { imageToWebp } from '../apps/api/dist/image-webp.js';
import { AssetUploadsController } from '../apps/api/dist/asset-uploads.controller.js';
import { BannersController } from '../apps/api/dist/banners.controller.js';
import { GuideController } from '../apps/api/dist/guide.controller.js';

const source = () => sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 50, g: 120, b: 200, alpha: 0.5 } } });
test('WebP conversion decodes JPEG/PNG/WebP and preserves transparency', async () => {
  for (const format of ['jpeg', 'png', 'webp']) {
    const data = await imageToWebp(await source()[format]().toBuffer());
    const meta = await sharp(data).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.width, 32);
    assert.equal(meta.height, 24);
    if (format !== 'jpeg') {
      const { data: rgba } = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.ok(rgba[3] > 100 && rgba[3] < 150);
    }
  }
});
test('WebP conversion resizes oversized images and rejects invalid input', async () => {
  const large = await sharp({create:{width:3000,height:1500,channels:3,background:'red'}}).jpeg().toBuffer();
  const meta = await sharp(await imageToWebp(large)).metadata();
  assert.equal(meta.width, 2560);
  assert.equal(meta.height, 1280);
  for (const input of [undefined, Buffer.from('not an image'), (await source().png().toBuffer()).subarray(0, 40), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')]) {
    await assert.rejects(imageToWebp(input), e => e.getStatus() === 400);
  }
});
test('Banner and guide uploads persist actual WebP bytes and MIME', async () => {
  for (const Controller of [BannersController, GuideController]) {
    let saved;
    const db = { pool: { execute: async (_sql, values) => { saved = values; } } };
    const result = await new Controller(db).upload({buffer:await source().png().toBuffer()});
    assert.match(result.url, /\/images\/[0-9a-f-]{36}$/);
    assert.equal(saved[1], 'image/webp');
    assert.equal((await sharp(saved[2]).metadata()).format, 'webp');
  }
});
test('Asset upload saves a WebP filename with valid WebP content', async () => {
  const result = await new AssetUploadsController().upload([{buffer:await source().png().toBuffer(),mimetype:'image/png',size:100}]);
  const path = resolve('uploads/assets', basename(result.urls[0]));
  try {
    assert.match(result.urls[0], /\.webp$/);
    assert.equal((await sharp(await readFile(path)).metadata()).format, 'webp');
  } finally { await unlink(path); }
});
