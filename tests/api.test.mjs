import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const url = "http://127.0.0.1:3001/api";
test("health terhubung ke MySQL", async () => {
  const r = await fetch(url + "/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).database, "mysql");
});
test("filter gabungan dan pengurutan benar", async () => {
  const r = await fetch(
    url + "/assets?category=Rumah&city=Semarang&maxPrice=700000000&sort=lowest",
  );
  assert.equal(r.status, 200);
  const { data } = await r.json();
  assert.ok(data.length > 0);
  assert.ok(
    data.every(
      (a) =>
        a.category === "Rumah" && a.city === "Semarang" && a.price <= 700000000,
    ),
  );
  const all = await (await fetch(url + "/assets?sort=lowest")).json();
  assert.ok(all.data.every((a, i) => !i || a.price >= all.data[i - 1].price));
});
test("pencarian, hasil kosong, dan detail 404", async () => {
  const found = await (await fetch(url + "/assets?q=BKK-0001")).json();
  assert.equal(found.data[0].code, "BKK-0001");
  const empty = await (
    await fetch(url + "/assets?q=tidak-ada-aset-xyz")
  ).json();
  assert.equal(empty.total, 0);
  assert.equal((await fetch(url + "/assets/tidak-ada-aset-xyz")).status, 404);
});
test("input dan urutan yang tidak diizinkan ditolak", async () => {
  assert.equal((await fetch(url + "/assets?sort=DROP%20TABLE")).status, 400);
  assert.equal((await fetch(url + "/assets?maxPrice=-1")).status, 400);
  const r = await fetch(url + "/assets/rumah-banyumanik/interests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "X",
      email: "salah",
      phone: "x",
      message: "",
      consent: false,
    }),
  });
  assert.equal(r.status, 400);
});
test("formulir minat tersimpan, kemudian hanya data pengujian dibersihkan", async () => {
  const email = `test-${Date.now()}@example.test`;
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lelang_bkkjateng",
  });
  try {
    const r = await fetch(url + "/assets/rumah-banyumanik/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pengujian Integrasi",
        email,
        phone: "081234567890",
        message: "Data pengujian otomatis",
        consent: true,
      }),
    });
    assert.equal(r.status, 201);
    const [rows] = await db.execute(
      "SELECT name,consent FROM interests WHERE email = ?",
      [email],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].consent, 1);
  } finally {
    await db.execute("DELETE FROM interests WHERE email = ?", [email]);
    await db.end();
  }
});
