import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardAnalytics } from "../apps/web/src/features/dashboard/analytics.ts";

test("grafik dashboard memakai aset aktif dan batas harga lebih dari Rp1 miliar", () => {
  const summary = getDashboardAnalytics([
    { id: 1, price: "1500000000", category: "Rumah", saleMethod: "Jual Beli", archived: 0 },
    { id: 2, price: 1000000000, category: "Rumah", saleMethod: "Lelang", archived: 0 },
    { id: 3, price: 2000000000, category: "Tanah", saleMethod: "Cessie", archived: 0 },
    { id: 4, price: 5000000000, category: "Tanah", saleMethod: "Lelang", archived: 1 },
    { id: 5, price: 250000000, category: "Kendaraan", saleMethod: "Jual Beli", archived: 0 },
  ]);
  assert.equal(summary.active.length, 4);
  assert.equal(summary.total, 4750000000);
  assert.deepEqual(summary.methods.map(group => [group.name, group.count, group.total]), [
    ["Jual Beli", 2, 1750000000], ["Cessie", 1, 2000000000], ["Lelang", 1, 1000000000],
  ]);
  assert.equal(summary.categories.find(group => group.name === "Rumah").count, 2);
  assert.equal(summary.categories.reduce((sum, group) => sum + group.total, 0), summary.total);
  assert.deepEqual(summary.highValue.map(asset => asset.id), [3, 1]);
});

test("dashboard kosong tetap memiliki tiga metode tanpa nilai NaN", () => {
  const summary = getDashboardAnalytics([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.methods.length, 3);
  assert.ok(summary.methods.every(group => group.count === 0 && group.total === 0));
  assert.deepEqual(summary.categories, []);
  assert.deepEqual(summary.highValue, []);
});
