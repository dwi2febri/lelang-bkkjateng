import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

test("data pemohon mengikuti akun dan satu aset hanya dapat diajukan sekali", async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "lelang_bkkjateng" });
  const users = [];
  const prefix = `interest-test-${randomBytes(8).toString("hex")}`;
  const base = "http://127.0.0.1:3000/api";
  try {
    const [[asset]] = await db.query("SELECT id,slug FROM assets WHERE archived=0 LIMIT 1");
    assert.ok(asset);
    for (let index = 0; index < 2; index++) {
      const applicant = { name: `Pemohon Test ${index}`, email: `${prefix}-${index}@example.invalid`, phone: "081234567890" };
      const [created] = await db.execute("INSERT INTO public_users(name,email,phone,password_hash) VALUES(?,?,?,?)", [applicant.name, applicant.email, applicant.phone, "unused"]);
      const token = randomBytes(32).toString("hex");
      users.push({ ...applicant, id: created.insertId, cookie: `bkk_public_session=${token}` });
      await db.execute("INSERT INTO public_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))", [createHash("sha256").update(token).digest("hex"), created.insertId]);
    }
    const status = cookie => fetch(`${base}/assets/${asset.slug}/interest-status`, { headers: cookie ? { Cookie: cookie } : {} });
    const send = (user, override = {}) => fetch(`${base}/assets/${asset.slug}/interests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "BKKPublic", Origin: "http://localhost:3000", ...(user ? { Cookie: user.cookie } : {}) },
      body: JSON.stringify({ name: "Nama Diubah", email: `${prefix}-guest@example.invalid`, phone: "089999999999", message: "Permintaan informasi", consent: true, ...override }),
    });
    assert.equal((await status()).status, 401);
    assert.deepEqual(await (await status(users[0].cookie)).json(), { submitted: false });
    const requests = await Promise.all([send(users[0]), send(users[0])]);
    assert.deepEqual(requests.map(response => response.status).sort(), [201, 409]);
    const [rows] = await db.execute("SELECT name,email,phone FROM interests WHERE public_user_id=? AND asset_id=?", [users[0].id, asset.id]);
    assert.equal(rows.length, 1);
    assert.deepEqual({ ...rows[0] }, { name: users[0].name, email: users[0].email, phone: users[0].phone });
    const checked = await status(users[0].cookie);
    assert.match(checked.headers.get("cache-control"), /no-store/);
    assert.deepEqual(await checked.json(), { submitted: true });
    assert.deepEqual(await (await status(users[1].cookie)).json(), { submitted: false });
    assert.equal((await send(users[1])).status, 201, "akun lain tetap boleh mengajukan aset yang sama");
    for (const state of ["diproses", "selesai", "ditolak"]) {
      await db.execute("UPDATE interests SET status=? WHERE public_user_id=?", [state, users[0].id]);
      assert.equal((await send(users[0])).status, 409, `status ${state} tetap tidak boleh diajukan ulang`);
    }
    assert.equal((await send(null)).status, 201);
    assert.equal((await send(null)).status, 409, "pengajuan tamu dengan email yang sama juga ditolak");
  } finally {
    await db.execute("DELETE FROM interests WHERE email LIKE ?", [`${prefix}%`]);
    for (const user of users) {
      await db.execute("DELETE FROM public_sessions WHERE user_id=?", [user.id]);
      await db.execute("DELETE FROM public_users WHERE id=?", [user.id]);
    }
    await db.end();
  }
});
