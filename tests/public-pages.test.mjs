import test from "node:test";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const api = "http://127.0.0.1:3001/api/assets";
test("beranda, katalog, dan jadwal memiliki halaman serta navigasi terpisah", async () => {
  const home = await (await fetch(base)).text();
  assert.match(home, /Aset rekomendasi/);
  assert.match(home, /href="\/katalog-aset"/);
  assert.match(home, /href="\/jadwal-lelang"/);
  assert.match(home, /class="search-panel"/);
  assert.match(home, /action="\/katalog-aset"/);
  assert.match(home, /href="\/katalog-aset\?category=Tanah"/);
  assert.match(home, /PILIH SESUAI KEBUTUHAN/);
  assert.doesNotMatch(home, /class="filter-row"/);
  for (const [path, title] of [
    ["/katalog-aset", "Katalog Aset"],
    ["/jadwal-lelang", "Jadwal Lelang"],
    ["/favorit", "Aset Favorit"],
  ]) {
    const result = await fetch(base + path);
    assert.equal(result.status, 200);
    const html = await result.text();
    assert.ok(html.includes(title));
    assert.doesNotMatch(html, /class="hero"/);
  }
  const catalog = await (
    await fetch(base + "/katalog-aset?category=Tanah")
  ).text();
  assert.match(catalog, /Seluruh aset lelang/);
  assert.match(catalog, /class="catalog-sidebar"/);
  assert.doesNotMatch(catalog, /class="search-panel"/);
  assert.doesNotMatch(catalog, /PILIH SESUAI KEBUTUHAN/);
  assert.match(catalog, /name="category" value="Tanah"/);
  assert.match(catalog, /role="combobox"/);
  const schedule = await (await fetch(base + "/jadwal-lelang")).text();
  assert.match(schedule, /Semua jadwal/);
  assert.match(schedule, /Berlalu/);
  assert.doesNotMatch(schedule, /class="search-panel"/);
});

test("pencarian beranda membawa kombinasi filter ke URL katalog", async () => {
  const { catalogHref } =
    await import("../apps/web/src/features/catalog/types/page.ts");
  const href = catalogHref({
    q: "Rumah",
    category: "Rumah",
    city: "Semarang",
    maxPrice: "700000000",
  });
  const parsed = new URL(href, base);
  assert.equal(parsed.pathname, "/katalog-aset");
  assert.equal(parsed.searchParams.get("q"), "Rumah");
  assert.equal(parsed.searchParams.get("category"), "Rumah");
  assert.equal(parsed.searchParams.get("city"), "Semarang");
  assert.equal(parsed.searchParams.get("maxPrice"), "700000000");
  assert.equal(
    catalogHref({ category: "Semua", city: "Semua lokasi", q: " " }),
    "/katalog-aset",
  );
  const html = await (await fetch(base + href)).text();
  assert.match(html, /value="700000000"/);
  assert.match(html, /value="Rumah"/);
  const result = await (await fetch(api + parsed.search)).json();
  assert.ok(result.data.length > 0);
  assert.ok(
    result.data.every(
      (asset) =>
        asset.category === "Rumah" &&
        asset.city === "Semarang" &&
        asset.price <= 700000000,
    ),
  );
});
test("beranda hanya mengambil aset unggulan dan katalog mendukung semua halaman", async () => {
  const all = await (await fetch(api + "?pageSize=200")).json();
  const recommended = await (
    await fetch(api + "?featured=true&pageSize=4")
  ).json();
  assert.ok(recommended.data.length <= 4);
  assert.ok(recommended.data.every((a) => a.featured === 1));
  assert.equal(
    recommended.total,
    all.data.filter((a) => a.featured === 1).length,
  );
  const first = await (await fetch(api + "?pageSize=2&page=1")).json();
  const second = await (await fetch(api + "?pageSize=2&page=2")).json();
  assert.equal(first.total, all.total);
  assert.ok(first.data.length <= 2);
  assert.ok(second.data.every((a) => !first.data.some((b) => a.id === b.id)));
  assert.deepEqual(
    [...first.data, ...second.data].map((a) => a.id),
    all.data.slice(0, 4).map((a) => a.id),
  );
});
test("jadwal mendatang dan berlalu terpisah serta diurutkan berdasarkan waktu", async () => {
  const before = Date.now();
  const upcoming = await (
    await fetch(api + "?period=upcoming&sort=soonest")
  ).json();
  const past = await (await fetch(api + "?period=past&sort=soonest")).json();
  const after = Date.now();
  assert.ok(
    upcoming.data.every(
      (a) => new Date(a.auctionDate).getTime() >= before - 1000,
    ),
  );
  assert.ok(past.data.every((a) => new Date(a.auctionDate).getTime() <= after));
  assert.ok(
    upcoming.data.every(
      (a, i) =>
        !i ||
        new Date(a.auctionDate) >= new Date(upcoming.data[i - 1].auctionDate),
    ),
  );
  assert.ok(past.data.every((a) => !upcoming.data.some((b) => a.id === b.id)));
  for (const query of [
    "period=invalid",
    "featured=false",
    "page=0",
    "pageSize=201",
  ])
    assert.equal((await fetch(api + "?" + query)).status, 400);
});
