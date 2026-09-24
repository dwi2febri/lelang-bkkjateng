import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

test("galeri, statistik sesi unik, dan hitungan pengajuan", async () => {
  const api = "http://127.0.0.1:3001/api/assets";
  const listing = await (await fetch(`${api}?pageSize=1`)).json();
  const asset = listing.data[0];
  const url = `${api}/${asset.slug}`;
  const visitorId = randomUUID();
  const email = `gallery-${visitorId}@example.com`;
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "lelang_bkkjateng" });
  const post = (path, body) => fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    const before = await (await fetch(url)).json();
    assert.ok(before.photos.length > 1);
    assert.equal(before.photos[0], asset.image);
    assert.equal((await post(`${url}/views`, { visitorId: "invalid" })).status, 400);
    const first = await post(`${url}/views`, { visitorId });
    assert.equal(first.status, 200);
    const firstCount = (await first.json()).viewCount;
    assert.equal(firstCount, before.viewCount + 1);
    const second = await (await post(`${url}/views`, { visitorId })).json();
    assert.equal(second.viewCount, firstCount);
    const interest = await post(`${url}/interests`, { name: "Gallery Test", email, phone: "081234567890", message: "Pengujian statistik", consent: true });
    assert.equal(interest.status, 201);
    const after = await (await fetch(url)).json();
    assert.equal(after.interestCount, before.interestCount + 1);
    const html = await (await fetch(`http://127.0.0.1:3000/katalog-aset/${asset.slug}`)).text();
    assert.match(html, /gallery-preview/);
    assert.match(html, /Perbesar foto/);
    assert.match(html, /facility-tabs/);
  } finally {
    await db.execute("DELETE FROM asset_views WHERE asset_id=? AND visitor_id=?", [asset.id, visitorId]);
    await db.execute("DELETE FROM interests WHERE asset_id=? AND email=?", [asset.id, email]);
    await db.end();
  }
});
