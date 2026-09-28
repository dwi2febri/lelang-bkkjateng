import test from "node:test";
import assert from "node:assert/strict";
import { readSubmissionHistory, saveSubmissionReceipt } from "../apps/web/src/features/catalog/submission-history.ts";

test("riwayat pengajuan tersimpan lokal tanpa data kontak dan hanya menerima tautan aset valid", () => {
  const values = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const asset = { slug: "rumah-banyumanik", code: "BKK-0001", title: "Rumah Modern Banyumanik", email: "rahasia@example.test", phone: "081234567890" };
    assert.equal(saveSubmissionReceipt(asset), true);
    const history = readSubmissionHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].slug, asset.slug);
    assert.ok(!JSON.stringify([...values.values()]).includes(asset.email));
    assert.ok(!JSON.stringify([...values.values()]).includes(asset.phone));
    values.set("bkk-interest-history-v1", JSON.stringify([
      { ...history[0], slug: "javascript:alert(1)" },
      history[0],
    ]));
    assert.equal(readSubmissionHistory().length, 1);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});
