import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const base = "http://127.0.0.1:3000/api/public-account";
const headers = { "Content-Type": "application/json", "x-requested-with": "BKKPublic", Origin: "http://localhost:3000" };
const request = (path, body, cookie) => fetch(base + path, { method: body === undefined ? "GET" : "POST", headers: cookie ? { ...headers, Cookie: cookie } : headers, body: body === undefined ? undefined : JSON.stringify(body) });

test("akun publik mengklaim riwayat hanya setelah verifikasi, menyimpan favorit, dan menolak akses anonim", async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "lelang_bkkjateng" });
  const email = `public-test-${Date.now()}@example.invalid`;
  const code = "12345678";
  const salt = randomBytes(16).toString("hex");
  const codeHash = `${salt}:${(await promisify(scrypt)(code,salt,64)).toString("hex")}`;
  let interestId, userId;
  try {
    const [[asset]] = await db.query("SELECT id FROM assets WHERE archived=0 LIMIT 1");
    assert.ok(asset?.id, "Aset pengujian tersedia");
    const [interest] = await db.execute("INSERT INTO interests(asset_id,name,email,phone,message,consent,source) VALUES(?,?,?,?,?,1,'public')", [asset.id,"Pemohon Lama",email,"081234567890","Pengajuan sebelumnya"]);
    interestId = interest.insertId;
    assert.equal((await request("/history")).status,401);
    assert.equal((await request("/favorites")).status,401);
    const rejected = await fetch(base + "/logout", { method:"POST", headers:{...headers, Origin:"https://evil.example"}, body:JSON.stringify({}) });
    assert.equal(rejected.status,403);
    await db.execute("INSERT INTO public_email_codes(email,code_hash,expires_at,attempts,sent_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE),0,UTC_TIMESTAMP())", [email,codeHash]);
    assert.equal((await request("/preview", {email,code:"00000000"})).status,400);
    const previewResponse = await request("/preview", {email,code});
    assert.equal(previewResponse.status,200);
    assert.deepEqual(await previewResponse.json(), {name:"Pemohon Lama",phone:"081234567890"});
    const registered = await request("/register", {name:"Pemohon Lama",email,phone:"081234567890",code,password:"kata-sandi-panjang-123",confirmation:"kata-sandi-panjang-123"});
    assert.equal(registered.status,201);
    const user = await registered.json(); userId = user.id;
    assert.equal(user.email,email);
    assert.ok(!("password_hash" in user));
    const cookie = registered.headers.get("set-cookie").split(";")[0];
    assert.match(registered.headers.get("set-cookie"),/HttpOnly/i);
    assert.match(registered.headers.get("set-cookie"),/SameSite=Strict/i);
    const history = await request("/history",undefined,cookie);
    assert.equal(history.status,200);
    assert.ok((await history.json()).some(row => row.id === interestId));
    const synced = await request("/favorites/sync",{ids:[asset.id]},cookie);
    assert.equal(synced.status,200);
    assert.deepEqual(await synced.json(),[asset.id]);
    assert.equal((await request("/logout",{},cookie)).status,200);
    assert.equal((await request("/history",undefined,cookie)).status,401);
    const login = await request("/login",{email,password:"kata-sandi-panjang-123"});
    assert.equal(login.status,200);
    const secondCookie = login.headers.get("set-cookie").split(";")[0];
    assert.deepEqual(await (await request("/favorites",undefined,secondCookie)).json(),[asset.id]);
    assert.ok((await (await request("/history",undefined,secondCookie)).json()).some(row => row.id === interestId));
  } finally {
    if (interestId) await db.execute("DELETE FROM interests WHERE id=?",[interestId]);
    if (userId) await db.execute("DELETE FROM public_users WHERE id=?",[userId]);
    await db.execute("DELETE FROM public_email_codes WHERE email=?",[email]);
    await db.end();
  }
});
