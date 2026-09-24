import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
const base = "http://127.0.0.1:3000";
const mutation = {
  "Content-Type": "application/json",
  "X-Requested-With": "BKKAdmin",
  Origin: base,
};
async function request(path, options = {}) {
  return fetch(base + "/api" + path, options);
}
async function login() {
  const response = await request("/auth/login", {
    method: "POST",
    headers: mutation,
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(response.status, 200, "Akun admin lokal harus dapat login");
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Max-Age=28800/i);
  return cookie.split(";")[0];
}
test("rute admin dan data pribadi menolak akses anonim", async () => {
  for (const path of [
    "/auth/me",
    "/admin/dashboard",
    "/admin/assets",
    "/admin/pengajuan",
    "/admin/pengajuan/1",
  ])
    assert.equal((await request(path)).status, 401, path);
  for (const path of [
    "/dashboard",
    "/pengajuan",
    "/pengajuan/baru",
    "/aset",
    "/approval",
  ]) {
    const result = await fetch(base + path, { redirect: "manual" });
    assert.equal(result.status, 307, path);
    assert.equal(result.headers.get("location"), "/login");
  }
  const loginPage = await fetch(base + "/login");
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /Masuk ke admin/);
});
test("login salah dan permintaan lintas origin ditolak", async () => {
  const bad = await request("/auth/login", {
    method: "POST",
    headers: mutation,
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: "password-yang-salah",
    }),
  });
  assert.equal(bad.status, 401);
  const foreign = await request("/auth/login", {
    method: "POST",
    headers: { ...mutation, Origin: "https://not-allowed.example" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: "salah" }),
  });
  assert.equal(foreign.status, 403);
});
test("login, sesi persisten, SSR admin, CSRF, logout dan revokasi", async () => {
  const cookie = await login();
  try {
    const me = await request("/auth/me", { headers: { Cookie: cookie } });
    assert.equal(me.status, 200);
    const user = await me.json();
    assert.equal(user.role, "admin");
    assert.ok(!("password_hash" in user));
    assert.match(me.headers.get("cache-control"), /no-store/);
    assert.equal(
      (await request("/admin/dashboard", { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    const page = await fetch(base + "/dashboard", {
      headers: { Cookie: cookie },
    });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Ruang kerja administrator/);
    const missingHeader = await request("/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(missingHeader.status, 403);
    assert.equal(
      (
        await request("/admin/assets/1/archive", {
          method: "PATCH",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        })
      ).status,
      403,
    );
  } finally {
    const logout = await request("/auth/logout", {
      method: "POST",
      headers: { ...mutation, Cookie: cookie },
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  }
  assert.equal(
    (await request("/auth/me", { headers: { Cookie: cookie } })).status,
    401,
  );
});
test("alur aset dan pengajuan tersimpan, riwayat atomik, versi konflik, arsip dan pemulihan", async () => {
  const cookie = await login();
  const headers = { ...mutation, Cookie: cookie };
  const suffix = String(Date.now());
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lelang_bkkjateng",
  });
  let assetId, interestId;
  const input = {
    slug: "test-aset-" + suffix,
    code: "TEST-" + suffix,
    title: "Aset Pengujian Integrasi",
    category: "Rumah",
    saleMethod: "Cessie",
    city: "Semarang",
    address: "Alamat pengujian otomatis",
    price: 400000000,
    oldPrice: 500000000,
    land: 100,
    building: 80,
    bedrooms: 2,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
    auctionDate: "2026-12-10T03:00:00.000Z",
    certificate: "SHM",
    description: "Data sementara untuk pengujian integrasi admin.",
    featured: false,
  };
  try {
    const created = await request("/admin/assets", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    assert.equal(created.status, 201);
    const asset = await created.json();
    assetId = asset.id;
    assert.equal(asset.saleMethod, "Cessie");
    assert.equal(
      new Date(asset.auctionDate).toISOString(),
      input.auctionDate,
      "Jadwal WIB harus round-trip tanpa bergeser",
    );
    const detail = await request("/assets/" + input.slug);
    assert.equal(detail.status, 200);
    const updated = await request("/admin/assets/" + assetId, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...input, price: 390000000 }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).price, 390000000);
    const invalid = await request("/admin/assets/" + assetId, {
      method: "PUT",
      headers,
      body: JSON.stringify({ ...input, price: -1 }),
    });
    assert.equal(invalid.status, 400);
    const duplicate = await request("/admin/assets", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    assert.equal(duplicate.status, 409);
    const createdInterest = await request("/admin/pengajuan", {
      method: "POST",
      headers,
      body: JSON.stringify({
        assetId,
        name: "Pemohon Tes",
        email: "admin-test-" + suffix + "@example.test",
        phone: "081234567890",
        message: "Pengujian alur admin",
      }),
    });
    assert.equal(createdInterest.status, 201);
    const interest = await createdInterest.json();
    interestId = interest.id;
    assert.equal(interest.source, "admin");
    assert.equal(interest.consent, 0);
    const changed = await request(
      "/admin/pengajuan/" + interestId + "/status",
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "diproses",
          notes: "Pemohon sudah dihubungi.",
          version: 0,
        }),
      },
    );
    assert.equal(changed.status, 200);
    const processed = await changed.json();
    assert.equal(processed.version, 1);
    assert.equal(processed.history.length, 1);
    assert.equal(processed.history[0].status, "diproses");
    const stale = await request("/admin/pengajuan/" + interestId + "/status", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "selesai",
        notes: "Data stale",
        version: 0,
      }),
    });
    assert.equal(stale.status, 409);
    const invalidReject = await request(
      "/admin/pengajuan/" + interestId + "/status",
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "ditolak", notes: "", version: 1 }),
      },
    );
    assert.equal(invalidReject.status, 400);
    const list = await (
      await request("/admin/pengajuan?status=diproses&q=" + suffix, {
        headers: { Cookie: cookie },
      })
    ).json();
    assert.ok(list.data.some((i) => i.id === interestId));
    for (const archived of [true, false]) {
      const changedArchive = await request(
        "/admin/assets/" + assetId + "/archive",
        { method: "PATCH", headers, body: JSON.stringify({ archived }) },
      );
      assert.equal(changedArchive.status, 200);
      assert.equal(
        (await request("/assets/" + input.slug)).status,
        archived ? 404 : 200,
      );
    }
    const [rows] = await db.execute(
      "SELECT i.status,COUNT(h.id) history_count FROM interests i JOIN interest_history h ON h.interest_id=i.id WHERE i.id=? GROUP BY i.id",
      [interestId],
    );
    assert.equal(rows[0].status, "diproses");
    assert.equal(rows[0].history_count, 1);
  } finally {
    if (interestId)
      await db.execute("DELETE FROM interests WHERE id=? AND email=?", [
        interestId,
        "admin-test-" + suffix + "@example.test",
      ]);
    if (assetId)
      await db.execute("DELETE FROM assets WHERE id=? AND code=?", [
        assetId,
        input.code,
      ]);
    await db.end();
    await request("/auth/logout", { method: "POST", headers });
  }
});
