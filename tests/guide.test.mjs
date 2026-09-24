import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
const base = "http://127.0.0.1:3000";
const headers = {
  "Content-Type": "application/json",
  "X-Requested-With": "BKKAdmin",
  Origin: base,
};
test("panduan: proteksi admin, upload, simpan, konflik versi, dan halaman publik", async () => {
  assert.equal(
    (
      await fetch(`${base}/api/admin/guide`, {
        method: "PUT",
        headers,
        body: "{}",
      })
    ).status,
    401,
  );
  assert.equal(
    (await fetch(`${base}/kelola-panduan`, { redirect: "manual" })).status,
    307,
  );
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { ...headers, Cookie: cookie };
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lelang_bkkjateng",
  });
  const [rows] = await db.query("SELECT * FROM guide_content WHERE id=1");
  const original = rows[0];
  let imageId;
  let changed = false;
  try {
    const uploadHeaders = {
      "X-Requested-With": "BKKAdmin",
      Origin: base,
      Cookie: cookie,
    };
    const bad = new FormData();
    bad.append(
      "image",
      new Blob(["<svg></svg>"], { type: "image/png" }),
      "fake.png",
    );
    assert.equal(
      (
        await fetch(`${base}/api/admin/guide/images`, {
          method: "POST",
          headers: uploadHeaders,
          body: bad,
        })
      ).status,
      400,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=",
      "base64",
    );
    const form = new FormData();
    form.append("image", new Blob([png], { type: "image/png" }), "test.png");
    const upload = await fetch(`${base}/api/admin/guide/images`, {
      method: "POST",
      headers: uploadHeaders,
      body: form,
    });
    assert.equal(upload.status, 201);
    const { url } = await upload.json();
    imageId = url.split("/").pop();
    const image = await fetch(base + url);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const blocks = [
      {
        type: "text",
        heading: "Uji panduan",
        text: "Teks <script>alert(1)</script> tetap teks biasa.",
      },
      { type: "image", url, caption: "Gambar uji panduan" },
    ];
    const body = JSON.stringify({
      title: "Panduan Lelang",
      version: original.version,
      blocks,
    });
    const saved = await fetch(`${base}/api/admin/guide`, {
      method: "PUT",
      headers: auth,
      body,
    });
    assert.equal(saved.status, 200);
    changed = true;
    assert.equal(
      (
        await fetch(`${base}/api/admin/guide`, {
          method: "PUT",
          headers: auth,
          body,
        })
      ).status,
      409,
    );
    const guide = await (await fetch(`${base}/api/guide`)).json();
    assert.deepEqual(guide.blocks, blocks);
    const page = await fetch(`${base}/panduan-lelang`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes("Uji panduan"));
    assert.ok(html.includes(url));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.equal(
      (
        await fetch(`${base}/api/admin/guide`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body,
        })
      ).status,
      403,
    );
  } finally {
    if (changed)
      await db.execute(
        "UPDATE guide_content SET title=?,blocks=?,version=?,updated_at=? WHERE id=1",
        [
          original.title,
          typeof original.blocks === "string"
            ? original.blocks
            : JSON.stringify(original.blocks),
          original.version,
          original.updated_at,
        ],
      );
    if (imageId)
      await db.execute("DELETE FROM guide_images WHERE id=?", [imageId]);
    await db.end();
    await fetch(`${base}/api/auth/logout`, { method: "POST", headers: auth });
  }
});
