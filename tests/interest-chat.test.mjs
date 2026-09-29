import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const base = "http://127.0.0.1:3000/api";
const token = () => randomBytes(32).toString("hex");
const digest = value => createHash("sha256").update(value).digest("hex");
const post = (path, body, cookie, role = "BKKPublic", method = "POST") => fetch(base + path, {
  method, headers: { "Content-Type": "application/json", "x-requested-with": role, Origin: "http://localhost:3000", Cookie: cookie }, body: JSON.stringify(body),
});
const get = (path, cookie) => fetch(base + path, { headers: { Cookie: cookie } });

test("status publik mengikuti admin dan chat hanya untuk pemohon saat diproses", async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "lelang_bkkjateng" });
  const ids = { users: [], interest: null, sessions: [] };
  try {
    const [[asset]] = await db.query("SELECT id FROM assets WHERE archived=0 LIMIT 1");
    const [[admin]] = await db.query("SELECT id FROM admin_users WHERE active=1 LIMIT 1");
    assert.ok(asset?.id && admin?.id);
    for (let n = 0; n < 2; n++) {
      const [created] = await db.execute("INSERT INTO public_users(name,email,phone,password_hash) VALUES(?,?,?,?)", [`Chat Tester ${n}`, `chat-test-${Date.now()}-${n}@example.invalid`, "081234567890", "unused"]);
      ids.users.push(created.insertId);
    }
    const [created] = await db.execute("INSERT INTO interests(asset_id,name,email,phone,message,consent,source,public_user_id) VALUES(?,?,?,?,?,1,'public',?)", [asset.id, "Chat Tester 0", `chat-test-${Date.now()}@example.invalid`, "081234567890", "Halo", ids.users[0]]);
    ids.interest = created.insertId;
    const cookies = [];
    for (let n = 0; n < 3; n++) {
      const value = token();
      const isAdmin = n === 2;
      await db.execute(isAdmin
        ? "INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))"
        : "INSERT INTO public_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))",
        [digest(value), isAdmin ? admin.id : ids.users[n]]);
      ids.sessions.push({ hash: digest(value), isAdmin });
      cookies.push(`${isAdmin ? "bkk_admin_session" : "bkk_public_session"}=${value}`);
    }
    const path = `/public-account/history/${ids.interest}/messages`;
    const adminPath = `/admin/pengajuan/${ids.interest}/messages`;
    assert.equal((await get(path)).status, 401);
    assert.equal((await get(path, cookies[1])).status, 404);
    assert.equal((await post(path, { body: "Halo" }, cookies[0])).status, 403);
    const before = await (await get("/public-account/history", cookies[0])).json();
    assert.equal(before.find(item => item.id === ids.interest).status, "baru");
    const changed = await post(`/admin/pengajuan/${ids.interest}/status`, { status: "diproses", notes: "Catatan internal rahasia", version: 0 }, cookies[2], "BKKAdmin", "PATCH");
    assert.equal(changed.status, 200);
    const history = await (await get("/public-account/history", cookies[0])).json();
    const entry = history.find(item => item.id === ids.interest);
    assert.equal(entry.status, "diproses");
    assert.deepEqual(entry.statusHistory.map(item => item.status), ["diproses"]);
    assert.ok(!JSON.stringify(entry).includes("Catatan internal rahasia"));
    assert.equal((await post(path, { body: "  Pesan pemohon  " }, cookies[0])).status, 201);
    assert.equal((await post(adminPath, { body: "Balasan pengelola" }, cookies[2], "BKKAdmin")).status, 201);
    const unread = await (await get("/public-account/history", cookies[0])).json();
    assert.equal(unread.find(item => item.id === ids.interest).unreadCount, 1);
    const publicChat = await (await get(path, cookies[0])).json();
    assert.deepEqual(publicChat.messages.map(item => item.body), ["Pesan pemohon", "Balasan pengelola"]);
    assert.equal((await (await get("/public-account/history", cookies[0])).json()).find(item => item.id === ids.interest).unreadCount, 1, "mengambil pesan saja belum menandainya dibaca");
    assert.equal((await get(path, cookies[1])).status, 404);
    const readPath = `${path}/read`;
    assert.equal((await post(readPath, { through: publicChat.messages.at(-1).id }, cookies[1])).status, 404);
    assert.equal((await post(readPath, { through: publicChat.messages.at(-1).id }, cookies[0])).status, 200);
    assert.equal((await (await get("/public-account/history", cookies[0])).json()).find(item => item.id === ids.interest).unreadCount, 0);
    const closed = await post(`/admin/pengajuan/${ids.interest}/status`, { status: "selesai", notes: "Selesai", version: 1 }, cookies[2], "BKKAdmin", "PATCH");
    assert.equal(closed.status, 200);
    assert.equal((await post(path, { body: "Pesan setelah selesai" }, cookies[0])).status, 403);
    const last = await (await get("/public-account/history", cookies[0])).json();
    assert.deepEqual(last.find(item => item.id === ids.interest).statusHistory.map(item => item.status), ["diproses", "selesai"]);
  } finally {
    if (ids.interest) await db.execute("DELETE FROM interests WHERE id=?", [ids.interest]);
    for (const session of ids.sessions) await db.execute(`DELETE FROM ${session.isAdmin ? "admin_sessions" : "public_sessions"} WHERE token_hash=?`, [session.hash]);
    for (const id of ids.users) await db.execute("DELETE FROM public_users WHERE id=?", [id]);
    await db.end();
  }
});
