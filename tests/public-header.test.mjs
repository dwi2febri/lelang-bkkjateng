import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ quiet: true });
const base = "http://127.0.0.1:3000";

async function header(cookie) {
  const response = await fetch(base, { headers: cookie ? { Cookie: cookie } : {} });
  assert.equal(response.status, 200);
  const html = await response.text();
  const markup = html.match(/<header>[\s\S]*?<\/header>/)?.[0];
  assert.ok(markup, "Header must be in the initial server HTML before JavaScript runs");
  return { markup, html, response };
}

test("guest login link is already visible in the first HTML, including after refresh", async () => {
  for (const cookie of [undefined, undefined, "bkk_public_session=invalid"]) {
    const { markup } = await header(cookie);
    assert.match(markup, /class="public-login-link"/);
    assert.match(markup, /Sudah punya akun\?/);
    assert.doesNotMatch(markup, /class="public-logout-button"/);
  }
});

test("initial header uses a verified public session and rejects an expired session", async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lelang_bkkjateng",
  });
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  let userId;
  try {
    const [created] = await db.execute(
      "INSERT INTO public_users(name,email,phone,password_hash) VALUES(?,?,?,?)",
      ["Header Test", `header-${randomBytes(8).toString("hex")}@example.invalid`, "081234567890", "unused"],
    );
    userId = created.insertId;
    await db.execute("INSERT INTO public_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))", [hash, userId]);
    const cookie = `bkk_public_session=${token}`;
    for (let refresh = 0; refresh < 2; refresh++) {
      const { markup, html, response } = await header(cookie);
      assert.match(markup, /class="public-logout-button"/);
      assert.doesNotMatch(markup, /class="public-login-link"/);
      assert.ok(!html.includes(token), "Session token must never enter browser HTML");
      assert.match(response.headers.get("cache-control") || "", /no-store|private|no-cache/);
    }
    await db.execute("UPDATE public_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE token_hash=?", [hash]);
    const { markup } = await header(cookie);
    assert.match(markup, /class="public-login-link"/);
    assert.doesNotMatch(markup, /class="public-logout-button"/);
    const guest = await header();
    assert.match(guest.markup, /class="public-login-link"/, "Guest must not receive another visitor's cached header");
  } finally {
    await db.execute("DELETE FROM public_sessions WHERE token_hash=?", [hash]);
    if (userId) await db.execute("DELETE FROM public_users WHERE id=?", [userId]);
    await db.end();
  }
});
