import test from "node:test";
import assert from "node:assert/strict";

const body = '<path fill="currentColor" d="M0 0h24v24z"/>';
function iconsResponse(url) {
 const query=new URL(url),prefix=query.pathname.slice(1,-5);
 return Response.json({prefix,width:24,height:24,icons:Object.fromEntries(query.searchParams.get("icons").split(",").map(name=>[name,{body}]))});
}
let instance = 0;
const loader = () => import(`../apps/web/src/components/ui/icon-loader.ts?test=${++instance}`);

test("ikon dimuat dengan antrean terbatas, deduplikasi dan cache", async t => {
  let active = 0, peak = 0, calls = 0;
  t.mock.method(globalThis, "fetch", async url => {
    calls++; active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--; return iconsResponse(url);
  });
  const {loadIconImage} = await loader();
  const first = loadIconImage("iconoir:edit");
  assert.equal(loadIconImage("iconoir:edit"), first);
  const images = await Promise.all([first, ...Array.from({length: 24}, (_, i) => loadIconImage(`mdi:icon-${i}`))]);
  assert.equal(calls, 2);
  assert.equal(peak, 2);
  assert.ok(images.every(source => decodeURIComponent(source).includes(body)));
  assert.equal(await loadIconImage("iconoir:edit"), images[0]);
  assert.equal(calls, 2);
});

test("kegagalan server utama memakai cadangan untuk ikon berikutnya", async t => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async url => {
    urls.push(url);
    return url.startsWith("https://api.iconify.design") ? new Response("Too many requests", {status: 429}) : iconsResponse(url);
  });
  const {loadIconImage} = await loader();
  await loadIconImage("iconoir:chat-bubble-check");
  await loadIconImage("lucide:house");
  assert.equal(urls.length, 3);
  assert.ok(urls[1].startsWith("https://api.simplesvg.com/"));
  assert.ok(urls[2].startsWith("https://api.simplesvg.com/"));
});

test("koneksi gagal tidak disimpan permanen dan dapat dimuat ulang", async t => {
  let unavailable = true, calls = 0;
  t.mock.method(globalThis, "fetch", async url => {
    calls++;
    if (unavailable) throw new TypeError("Failed to fetch");
    return iconsResponse(url);
  });
  const {loadIconImage} = await loader();
  await assert.rejects(loadIconImage("lucide:award"));
  assert.equal(calls, 3);
  unavailable = false;
  assert.match(await loadIconImage("lucide:award"), /^data:image\/svg\+xml/);
  assert.equal(calls, 4);
});

test("nama salah, respons non-SVG dan permintaan batal tidak diterima", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {calls++; return new Response("<html>error</html>");});
  const {loadIconImage, fetchIconResource} = await loader();
  await assert.rejects(loadIconImage("https://example.com/icon.svg"));
  assert.equal(calls, 0);
  await assert.rejects(loadIconImage("iconoir:edit"));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchIconResource("collections", controller.signal), {name: "AbortError"});
  assert.equal(calls, 1);
});

test("alias ikon dan ikon yang hilang ditangani per item dalam satu batch", async t => {
 t.mock.method(globalThis,"fetch",async()=>Response.json({prefix:"mdi",width:24,height:24,icons:{base:{body}},aliases:{mirror:{parent:"base",hFlip:true}},not_found:["missing"]}));
 const {loadIconImage}=await loader();
 const results=await Promise.allSettled([loadIconImage("mdi:base"),loadIconImage("mdi:mirror"),loadIconImage("mdi:missing")]);
 assert.equal(results[0].status,"fulfilled");
 assert.equal(results[1].status,"fulfilled");
 assert.notEqual(results[0].value,results[1].value);
 assert.equal(results[2].status,"rejected");
});
