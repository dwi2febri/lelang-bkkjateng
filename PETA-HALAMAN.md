# Peta Kode Aplikasi

**LELANG BKK JATENG** ? Next.js / React / TypeScript ? NestJS ? MySQL

Panduan untuk menemukan file yang perlu diedit, mulai dari tampilan halaman sampai endpoint dan tabel database.

> **Cara membaca:** klik nama file untuk membuka source. Semua path relatif terhadap root proyek `C:/laragon/www/lelang-bkkjateng`.
>
> **Preview di VS Code:** tekan **Ctrl + Shift + V** atau **Ctrl + K**, lalu **V** untuk membuka preview di samping editor.

## Daftar isi

1. [Mulai dari sini](#mulai-dari-sini)
2. [Alur dan struktur folder](#alur-aplikasi)
3. [Halaman publik](#halaman-publik)
4. [Halaman admin](#halaman-admin)
5. [Endpoint backend](#endpoint-backend)
6. [Layout, styling, dan logo](#layout-dan-styling)
7. [Fitur di browser](#fitur-browser)
8. [Konfigurasi dan database](#konfigurasi-dan-database)
9. [Menjalankan dan memeriksa](#menjalankan)

---

<a id="mulai-dari-sini"></a>

## Mulai dari sini

| Mau mengubah apa? | Buka file ini |
| --- | --- |
| Menu atau footer situs publik | [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) |
| Banner beranda | [hero-slider.tsx](apps/web/src/features/catalog/components/hero-slider.tsx) |
| Filter katalog | [catalog-sidebar.tsx](apps/web/src/features/catalog/components/catalog-sidebar.tsx) |
| Detail aset dan tombol Ajukan BKK Joglo | [asset-detail.tsx](apps/web/src/features/catalog/components/asset-detail.tsx) |
| Galeri dan popup foto | [asset-gallery.tsx](apps/web/src/features/catalog/components/asset-gallery.tsx) |
| Warna, ukuran, dan jarak tampilan publik | [globals.css](apps/web/src/app/globals.css) |
| Menu atas admin | [navbar.tsx](apps/web/src/components/layout/navbar.tsx) |
| Query data aset publik | [assets.controller.ts](apps/api/src/assets.controller.ts) |
| Query dan proses admin | [admin.controller.ts](apps/api/src/admin/admin.controller.ts) |

> **Publik dan admin berbeda:** `components/layout/navbar.tsx` adalah navbar **admin**. Menu Beranda/Katalog Aset/Jadwal Lelang berada di `features/catalog/components/catalog-page.tsx`.


---

<a id="alur-aplikasi"></a>

## Alur dan struktur folder

```text
Browser: http://127.0.0.1:3000
  -> Next.js: apps/web/src/app/**/page.tsx
  -> Komponen halaman: apps/web/src/features/**/components/
  -> Service frontend atau fetch langsung
  -> /api/* diteruskan oleh apps/web/next.config.ts
  -> NestJS: http://127.0.0.1:3001/api/*
  -> Controller: apps/api/src/
  -> Database service: apps/api/src/database/database.service.ts
  -> MySQL
```

### Lokasi folder utama

```text
lelang-bkkjateng/
|-- apps/web/
|   |-- src/app/          Route, layout, dan CSS
|   |-- src/features/     Isi halaman per fitur
|   |-- src/components/   Komponen UI dan layout bersama
|   |-- src/services/     Client API
|   |-- src/lib/          Auth, Axios, dan utilitas
|   `-- public/           Logo dan gambar
|-- apps/api/src/         Controller dan koneksi MySQL
|-- scripts/              Setup tabel dan data dummy
`-- tests/                Pengujian aplikasi
```

### Arti nama file dan folder

`page.tsx` adalah pintu masuk halaman; isi UI biasanya berada di folder `features`. `[slug]` merupakan parameter URL berupa slug aset publik; `[id]` merupakan ID numerik untuk halaman admin. Folder `components`, `features`, dan `services` bukan route.

---

<a id="halaman-publik"></a>

## Halaman publik

### Beranda `/`

- **Route:** [page.tsx](apps/web/src/app/page.tsx)
- **Tampilan:** [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) dengan view `home`; banner di [hero-slider.tsx](apps/web/src/features/catalog/components/hero-slider.tsx)
- **API:** `GET /api/assets?featured=true&sort=recommended&page=1&pageSize=4`
- **Backend:** [assets.controller.ts](apps/api/src/assets.controller.ts)

### Katalog `/katalog-aset`

- **Route:** [katalog-aset/page.tsx](apps/web/src/app/katalog-aset/page.tsx)
- **Tampilan:** [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) dengan view `catalog`; filter di [catalog-sidebar.tsx](apps/web/src/features/catalog/components/catalog-sidebar.tsx)
- **API:** `GET /api/assets` dengan filter, sort, page, pageSize
- **Backend:** [assets.controller.ts](apps/api/src/assets.controller.ts)

### Detail `/katalog-aset/[slug]`

- **Route:** [detail/page.tsx](apps/web/src/app/katalog-aset/[slug]/page.tsx)
- **Tampilan:** [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) menerima `detailAsset`; isi di [asset-detail.tsx](apps/web/src/features/catalog/components/asset-detail.tsx); galeri di [asset-gallery.tsx](apps/web/src/features/catalog/components/asset-gallery.tsx)
- **API:** `GET /api/assets/:slug`, `GET /api/assets` untuk aset serupa, `POST /api/assets/:slug/views`, `POST /api/assets/:slug/interests`
- **Backend:** [assets.controller.ts](apps/api/src/assets.controller.ts)

### Jadwal `/jadwal-lelang`

- **Route:** [jadwal-lelang/page.tsx](apps/web/src/app/jadwal-lelang/page.tsx)
- **Tampilan:** [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) dengan view `schedule`; daftar tanggal di [schedule-list.tsx](apps/web/src/features/catalog/components/schedule-list.tsx)
- **Kalender:** [schedule-calendar.tsx](apps/web/src/features/catalog/components/schedule-calendar.tsx), pilihan Daftar/Kalender, navigasi bulan dan tombol Bulan ini. Klik aset membuka detail; tanggal dan jam menggunakan WIB.
- **Data kalender:** menggunakan `dateFrom` / `dateTo` untuk bulan terpilih dan mengambil semua halaman hasil, mengikuti filter Mendatang/Berlalu/Semua jadwal.
- **Interaksi kalender:** kartu kiri untuk memilih tanggal dengan penanda jumlah lelang; kartu kanan menampilkan foto, jam WIB, lokasi, dan tautan aset pada tanggal tersebut. Kedua kartu tersusun vertikal di layar kecil.
- **Hari libur:** browser mengambil `https://api-harilibur.pages.dev/api?year=YYYY`. Normalisasi tanggal dan penyaringan libur nasional ada di [holidays.ts](apps/web/src/features/catalog/services/holidays.ts). Minggu dan hari libur ditandai merah; kegagalan API menampilkan pesan dan tombol muat ulang tanpa menghalangi data lelang.
- **API:** `GET /api/assets?sort=soonest&period=upcoming` atau `past` / `all`, dengan pagination
- **Backend:** [assets.controller.ts](apps/api/src/assets.controller.ts)

### Favorit `/favorit`

- **Route:** [favorit/page.tsx](apps/web/src/app/favorit/page.tsx)
- **Tampilan:** [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) dengan view `favorites`
- **API:** `GET /api/assets`; pencocokan ID favorit dilakukan di browser
- **Backend:** [assets.controller.ts](apps/api/src/assets.controller.ts)

### Login `/login`

- **Route:** [login/page.tsx](apps/web/src/app/login/page.tsx)
- **Tampilan:** [login-form.tsx](apps/web/src/features/auth/components/login-form.tsx)
- **API:** `POST /api/auth/login`, `GET /api/auth/me`
- **Backend:** [auth.controller.ts](apps/api/src/auth/auth.controller.ts)

### Pintasan admin `/admin`

- **Route:** [admin/page.tsx](apps/web/src/app/admin/page.tsx)
- **Tampilan:** Redirect ke `/dashboard`
- **API:** Tidak memiliki endpoint khusus; dashboard memakai pemeriksaan sesi
- **Backend:** Tidak ada controller khusus; memakai proteksi dashboard.

### File pendukung halaman publik

- [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx): header dan footer publik, pencarian beranda, kartu aset, infinite scroll katalog, favorit, formulir minat, modal informasi.
- [hero-slider.tsx](apps/web/src/features/catalog/components/hero-slider.tsx): isi banner, foto, logo, interval pergantian slide.
- [catalog-sidebar.tsx](apps/web/src/features/catalog/components/catalog-sidebar.tsx): filter samping katalog.
- [asset-detail.tsx](apps/web/src/features/catalog/components/asset-detail.tsx): identitas dan harga, tombol Ajukan BKK Joglo, spesifikasi, fasilitas, lokasi, skema pembelian, simulasi, aset serupa.
- [asset-gallery.tsx](apps/web/src/features/catalog/components/asset-gallery.tsx): thumbnail, modal foto, navigasi galeri, hitungan dilihat dan pengajuan.
- [schedule-list.tsx](apps/web/src/features/catalog/components/schedule-list.tsx): tampilan daftar jadwal.
- [catalog-service.ts](apps/web/src/features/catalog/services/catalog-service.ts): `getCatalog()` dan `sendInterest()`.
- [types/index.ts](apps/web/src/features/catalog/types/index.ts): tipe data `CatalogAsset`.
- [types/page.ts](apps/web/src/features/catalog/types/page.ts): daftar route publik, tipe filter, pembentuk URL `catalogHref()`.

Seluruh endpoint aset publik ditangani oleh [assets.controller.ts](apps/api/src/assets.controller.ts). Endpoint login berada di [auth.controller.ts](apps/api/src/auth/auth.controller.ts).

### Alur saat detail aset dibuka

1. Klik aset dari katalog, beranda, favorit, atau jadwal menuju `/katalog-aset/<slug>`.
2. `apps/web/src/app/katalog-aset/[slug]/page.tsx` mengambil detail langsung dari NestJS pada server, menggunakan `API_URL` atau default `http://127.0.0.1:3001`.
3. Data diteruskan ke `CatalogPage`, lalu `AssetDetail` dan `AssetGallery`.
4. `AssetGallery` mengirim pencatatan kunjungan melalui endpoint `/views` di browser.
5. Formulir minat di `catalog-page.tsx` memakai `sendInterest()`, lalu backend menyimpan ke tabel `interests`.

File pendamping route detail:

- [loading.tsx](apps/web/src/app/katalog-aset/[slug]/loading.tsx): keadaan memuat.
- [error.tsx](apps/web/src/app/katalog-aset/[slug]/error.tsx): kegagalan layanan dan tombol coba lagi.
- [not-found.tsx](apps/web/src/app/katalog-aset/[slug]/not-found.tsx): aset tidak ditemukan atau sudah diarsipkan.

### Filter katalog

Query URL didukung: `q`, `category`, `city`, `saleMethod`, `tag`, `minPrice`, `maxPrice`, `dateFrom`, `dateTo`. Sort dan halaman berikutnya diatur oleh state `catalog-page.tsx` lalu dikirim ke API.

Contoh: `/katalog-aset?category=Rumah&city=Semarang&saleMethod=Jual+Beli&maxPrice=700000000`.

Validasi query backend berada pada `SearchDto` di `apps/api/src/assets.controller.ts`. Katalog memuat tambahan data dengan infinite scroll; jadwal memakai pagination.

---

<a id="halaman-admin"></a>

## Halaman admin

Semua endpoint `/api/admin/*` ada di [admin.controller.ts](apps/api/src/admin/admin.controller.ts), dilindungi [auth.guard.ts](apps/api/src/auth/auth.guard.ts). Validasi input admin berada di [admin.dto.ts](apps/api/src/admin/admin.dto.ts).

### Dashboard `/dashboard`

- **Route:** [dashboard/page.tsx](apps/web/src/app/dashboard/page.tsx)
- **Tampilan:** [dashboard.tsx](apps/web/src/features/dashboard/components/dashboard.tsx)
- **API:** Memanggil `api` langsung: `GET /api/admin/dashboard`; `asetService.list()`: `GET /api/admin/assets`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Daftar aset `/aset`

- **Route:** [aset/page.tsx](apps/web/src/app/aset/page.tsx)
- **Tampilan:** [aset-list.tsx](apps/web/src/features/aset/components/aset-list.tsx)
- **API:** [aset-service.ts](apps/web/src/features/aset/services/aset-service.ts): `GET /api/admin/assets`, `PATCH /api/admin/assets/:id/archive`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Tambah aset `/aset/baru`

- **Route:** [aset/baru/page.tsx](apps/web/src/app/aset/baru/page.tsx)
- **Tampilan:** [aset-form.tsx](apps/web/src/features/aset/components/aset-form.tsx)
- **API:** [aset-service.ts](apps/web/src/features/aset/services/aset-service.ts): `POST /api/admin/assets`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Edit aset `/aset/[id]`

- **Route:** [aset/id/page.tsx](apps/web/src/app/aset/[id]/page.tsx)
- **Tampilan:** [aset-form.tsx](apps/web/src/features/aset/components/aset-form.tsx)
- **API:** [aset-service.ts](apps/web/src/features/aset/services/aset-service.ts): `GET /api/admin/assets/:id`, `PUT /api/admin/assets/:id`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Daftar pengajuan `/pengajuan`

- **Route:** [pengajuan/page.tsx](apps/web/src/app/pengajuan/page.tsx)
- **Tampilan:** [pengajuan-list.tsx](apps/web/src/features/pengajuan/components/pengajuan-list.tsx)
- **API:** [pengajuan-service.ts](apps/web/src/features/pengajuan/services/pengajuan-service.ts): `GET /api/admin/pengajuan`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Catat pengajuan `/pengajuan/baru`

- **Route:** [pengajuan/baru/page.tsx](apps/web/src/app/pengajuan/baru/page.tsx)
- **Tampilan:** [pengajuan-form.tsx](apps/web/src/features/pengajuan/components/pengajuan-form.tsx)
- **API:** `asetService.list()`: `GET /api/admin/assets`; `pengajuanService.create()`: `POST /api/admin/pengajuan`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Detail pengajuan `/pengajuan/[id]`

- **Route:** [pengajuan/id/page.tsx](apps/web/src/app/pengajuan/[id]/page.tsx)
- **Tampilan:** [pengajuan-detail.tsx](apps/web/src/features/pengajuan/components/pengajuan-detail.tsx), [approval-form.tsx](apps/web/src/features/approval/components/approval-form.tsx)
- **API:** `GET /api/admin/pengajuan/:id`; `PATCH /api/admin/pengajuan/:id/status`
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### Tindak lanjut `/approval`

- **Route:** [approval/page.tsx](apps/web/src/app/approval/page.tsx)
- **Tampilan:** [pengajuan-list.tsx](apps/web/src/features/pengajuan/components/pengajuan-list.tsx) dengan prop `approval`
- **API:** Memakai `GET /api/admin/pengajuan`; perubahan status melalui detail pengajuan
- **Backend:** [admin.controller.ts](apps/api/src/admin/admin.controller.ts)

### File pendukung halaman admin

- `apps/web/src/features/pengajuan/hooks/use-pengajuan.ts`: pemuatan daftar dan filter pengajuan.
- `apps/web/src/features/pengajuan/schemas/pengajuan-schema.ts`: validasi formulir pengajuan.
- `apps/web/src/features/approval/services/approval-service.ts`: pengiriman status/catatan tindak lanjut.
- `apps/web/src/features/approval/components/status-badge.tsx`: label status.
- `apps/web/src/features/auth/services/auth-service.ts`: login, pemeriksaan sesi, logout.
- `apps/web/src/features/auth/hooks/use-auth.ts` dan `apps/web/src/hooks/use-auth.ts`: akses state/alur autentikasi.
- `apps/web/src/features/auth/schemas/login-schema.ts`: validasi login.

---

<a id="endpoint-backend"></a>

## Endpoint backend

### Aset publik

**Controller:** [assets.controller.ts](apps/api/src/assets.controller.ts)

| Endpoint | Fungsi / data |
| --- | --- |
| `GET /api/health` | Mengecek koneksi MySQL |
| `GET /api/assets` | Katalog dari `assets`; aset arsip disembunyikan |
| `GET /api/assets/:slug` | Detail `assets`, foto `asset_photos`, agregat `asset_views` dan `interests` |
| `POST /api/assets/:slug/views` | Menambah sesi kunjungan unik pada `asset_views`; input `visitorId` UUID |
| `POST /api/assets/:slug/interests` | Menyimpan minat publik ke `interests` |

### Autentikasi

**Controller:** [auth/auth.controller.ts](apps/api/src/auth/auth.controller.ts)

| Endpoint | Fungsi / data |
| --- | --- |
| `POST /api/auth/login` | Memeriksa `admin_users`, membuat `admin_sessions` dan cookie sesi |
| `GET /api/auth/me` | Mengembalikan admin yang sedang login |
| `POST /api/auth/logout` | Menghapus sesi login |

### Administrasi

**Controller:** [admin/admin.controller.ts](apps/api/src/admin/admin.controller.ts)

| Endpoint | Fungsi / data |
| --- | --- |
| `GET /api/admin/dashboard` | Ringkasan `assets` dan `interests` |
| `GET /api/admin/assets` | Daftar aset termasuk arsip |
| `GET /api/admin/assets/:id` | Detail aset admin |
| `POST /api/admin/assets` | Tambah aset |
| `PUT /api/admin/assets/:id` | Edit aset |
| `PATCH /api/admin/assets/:id/archive` | Arsip/pulihkan aset melalui nilai `archived` |
| `GET /api/admin/pengajuan` | Daftar pengajuan, filter, pagination |
| `GET /api/admin/pengajuan/:id` | Detail pengajuan dan riwayat |
| `POST /api/admin/pengajuan` | Catat pengajuan manual oleh admin |
| `PATCH /api/admin/pengajuan/:id/status` | Update status/catatan/versi; menyimpan `interest_history` |

Backend saat ini menggunakan query SQL melalui `Database`; bukan Prisma/TypeORM. Tidak ada endpoint tersendiri bernama `/api/approval`; tindak lanjut memakai endpoint status pengajuan.

---

<a id="layout-dan-styling"></a>

## Layout, styling, dan logo

| Bagian yang ingin diubah | Lokasi kode |
| --- | --- |
| Layout root, bahasa HTML, metadata default | [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx) |
| CSS halaman publik, detail, sidebar katalog, galeri, banner | [apps/web/src/app/globals.css](apps/web/src/app/globals.css) |
| CSS login dan admin | [apps/web/src/app/admin.css](apps/web/src/app/admin.css) |
| Navbar/header dan footer **publik** | [catalog-page.tsx](apps/web/src/features/catalog/components/catalog-page.tsx) |
| Navbar **admin** | [navbar.tsx](apps/web/src/components/layout/navbar.tsx) |
| Sidebar **admin** | [sidebar.tsx](apps/web/src/components/layout/sidebar.tsx) |
| Footer **admin** | [footer.tsx](apps/web/src/components/layout/footer.tsx) |
| Susunan area kerja admin | [admin-shell.tsx](apps/web/src/components/layout/admin-shell.tsx) |
| Proteksi layout admin | [protected-layout.tsx](apps/web/src/components/layout/protected-layout.tsx), digunakan `dashboard/layout.tsx`, `aset/layout.tsx`, `pengajuan/layout.tsx`, `approval/layout.tsx` |
| Pemeriksaan sesi dari server Next.js | [lib/auth.ts](apps/web/src/lib/auth.ts) |
| Logo bersama | [brand-logo.tsx](apps/web/src/components/ui/brand-logo.tsx); gambar aktif `apps/web/public/logo/bkk-lelang-v2.png` |
| Dropdown custom | [select.tsx](apps/web/src/components/ui/select.tsx) |
| Kalender custom | [date-picker.tsx](apps/web/src/components/ui/date-picker.tsx) |
| Input harga dengan separator ribuan | [price-input.tsx](apps/web/src/components/ui/price-input.tsx), [lib/price.ts](apps/web/src/lib/price.ts) |
| Tombol, input, modal umum | `apps/web/src/components/ui/` |

[Kembali ke daftar isi](#daftar-isi)

---

<a id="fitur-browser"></a>

## Fitur di browser

| Fitur | Lokasi / mekanisme |
| --- | --- |
| Favorit | `catalog-page.tsx`; ID aset pada localStorage `bkk-favorites`, bukan tabel favorit |
| Identitas sesi pengunjung | `asset-gallery.tsx`; sessionStorage `bkk-visitor`, dikirim ke endpoint `/views` |
| Modal foto | `asset-gallery.tsx`; state React dan portal, foto berasal dari API detail |
| Simulasi pembiayaan | Fungsi `MortgageCalculator` di `asset-detail.tsx`; perhitungan di browser |
| Ajukan BKK Joglo / Hubungi Kami | Link `#minat` di `asset-detail.tsx`; formulir yang sama mengirim ke `/interests`, belum ada API kredit tersendiri |
| Bagikan | Web Share API atau clipboard di `asset-detail.tsx` |
| Brosur | `window.print()` di `asset-detail.tsx`; gaya cetak pada `globals.css`, bukan generator PDF backend |
| Peta lokasi | Link Google Maps berdasarkan alamat di `asset-detail.tsx` |
| Daftar parameter akses/fasilitas | Array `facilities` di `asset-detail.tsx`; saat ini nilai masih “Belum tersedia”, belum CRUD fasilitas per aset |
| Bantuan, privasi, syarat | Modal informasi di `catalog-page.tsx`; belum berupa halaman URL tersendiri |
| Slider beranda | `hero-slider.tsx`; konten statis di source, bukan dari database |

---

<a id="konfigurasi-dan-database"></a>

## Konfigurasi dan database

| Kebutuhan | Lokasi |
| --- | --- |
| Proxy browser `/api/*` ke NestJS | [apps/web/next.config.ts](apps/web/next.config.ts) |
| Base URL frontend | [apps/web/src/config/env.ts](apps/web/src/config/env.ts) |
| Axios, cookie, header admin, penanganan 401 | [apps/web/src/lib/axios.ts](apps/web/src/lib/axios.ts) |
| Ekspor client API / penanganan error | [apps/web/src/services/api.ts](apps/web/src/services/api.ts) |
| Bootstrap NestJS, module, registrasi controller, ValidationPipe, port | [apps/api/src/main.ts](apps/api/src/main.ts) |
| Pool dan query MySQL | [database.service.ts](apps/api/src/database/database.service.ts) |
| Konfigurasi runtime/database | `.env` root; contoh konfigurasi di `.env.example` |

Variabel koneksi MySQL: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Jangan menaruh kredensial ke source frontend. `API_URL` dipakai Next.js untuk tujuan backend; `PORT` menentukan port NestJS (default 3001).

### Tabel dan setup

| Tabel | Kegunaan | Script pembuat |
| --- | --- | --- |
| `assets` | Data aset utama | `scripts/setup-db.mjs`; tambahan kolom admin di `scripts/setup-admin.mjs` |
| `interests` | Pengajuan minat | `scripts/setup-db.mjs`; tambahan kolom admin di `scripts/setup-admin.mjs` |
| `admin_users`, `admin_sessions` | Akun dan sesi admin | `scripts/setup-admin.mjs` |
| `interest_history` | Riwayat tindak lanjut | `scripts/setup-admin.mjs` |
| `asset_photos` | Foto tambahan aset | `scripts/setup-gallery.mjs` |
| `asset_views` | Kunjungan per aset dan sesi | `scripts/setup-gallery.mjs` |

Seed Jual Beli/Cessie: [scripts/seed-sales-demo.mjs](scripts/seed-sales-demo.mjs). Foto dummy: [scripts/setup-gallery.mjs](scripts/setup-gallery.mjs). Galeri sudah dibaca dari database; form admin belum menyediakan pengelolaan foto tambahan.

---

<a id="menjalankan"></a>

## Menjalankan dan memeriksa

Jalankan dari root proyek:

```powershell
npm.cmd run dev          # Web dan API sekaligus; cukup satu terminal
npm.cmd run build        # Build backend dan frontend
npm.cmd test             # Pengujian; web, API, dan MySQL harus berjalan
npm.cmd run db:setup     # Setup database, migrasi, dan seed
npm.cmd run db:gallery   # Setup galeri/statistik serta foto dummy
```

File pengujian ada di `tests/`, termasuk `public-pages.test.mjs`, `api.test.mjs`, `catalog-filters.test.mjs`, dan `asset-gallery.test.mjs`.

Edit source di `apps/api/src` atau `apps/web/src`. `apps/api/dist`, `apps/web/.next`, dan `node_modules` merupakan output/dependensi, bukan tempat mengubah fitur. Saat ini mode dev API menjalankan kompilasi awal lalu `node --watch dist/main.js`; setelah mengubah TypeScript backend, jalankan `npm.cmd run build -w apps/api` agar perubahan masuk ke `dist`.


---

[Kembali ke daftar isi](#daftar-isi)


## Panduan lelang yang dikelola admin

| Bagian | Route / file |
| --- | --- |
| Halaman publik | `/panduan-lelang` ? [page.tsx](apps/web/src/app/panduan-lelang/page.tsx) |
| Editor admin | `/kelola-panduan` ? [page.tsx](apps/web/src/app/kelola-panduan/page.tsx), dilindungi `ProtectedLayout` |
| Editor blok teks/gambar | [guide-editor.tsx](apps/web/src/features/guide/guide-editor.tsx) |
| Renderer teks dan gambar | [guide-content.tsx](apps/web/src/features/guide/guide-content.tsx) |
| Backend | [guide.controller.ts](apps/api/src/guide.controller.ts) |
| Setup tabel dan konten awal | [setup-guide.mjs](scripts/setup-guide.mjs) |
| Pengujian | [guide.test.mjs](tests/guide.test.mjs) |

Endpoint:

- `GET /api/guide`: konten publik dari tabel `guide_content`.
- `PUT /api/admin/guide`: menyimpan judul dan urutan blok; wajib sesi admin dan versi konten terbaru.
- `POST /api/admin/guide/images`: upload multipart dengan field `image`; JPG, PNG, WebP maksimal 5 MB; wajib sesi admin.
- `GET /api/guide/images/:id`: menampilkan gambar yang disimpan di tabel `guide_images` (LONGBLOB).

Admin menambah, menghapus, atau mengurutkan blok, mengisi teks/keterangan, lalu menekan **Simpan Panduan**. Konten langsung tampil ke publik setelah disimpan. Gambar yang baru diunggah tidak otomatis masuk konten sebelum disimpan. Tidak ada endpoint penghapusan permanen gambar; menghapus blok hanya menghapus penggunaannya dalam panduan.

Instalasi lama: jalankan `npm.cmd run db:guide`. Instalasi baru: sudah termasuk `npm.cmd run db:setup`. Menu Panduan Lelang di header/footer publik sekarang menuju halaman mandiri, bukan modal.

### Footer publik dan statistik pengunjung

- **Tampilan:** [public-footer.tsx](apps/web/src/features/catalog/components/public-footer.tsx), digunakan oleh `catalog-page.tsx` untuk semua halaman publik.
- **Isi:** profil singkat, alamat, kontak, produk, pengunjung hari ini, dan total pengunjung.
- **Backend:** [visitors.controller.ts](apps/api/src/visitors.controller.ts), `POST /api/visitors` dengan `visitorId` UUID v4.
- **Database:** tabel `site_visits`; siapkan dengan `npm run db:visitors` (juga termasuk `db:setup`).
- **Definisi:** harian = browser unik per tanggal WIB; total = browser unik sejak pencatatan dimulai. ID acak disimpan di localStorage, tanpa menyimpan IP. Menghapus penyimpanan browser atau memakai browser lain akan dihitung sebagai pengunjung baru. Jika statistik tidak tersedia, footer menampilkan tanda pisah.
- **Pengujian:** `node --test tests/visitors.test.mjs` memeriksa deduplikasi request bersamaan, tanggal WIB, dan validasi UUID.

### Pengaturan Banner `/kelola-banner`

- **Frontend admin:** [banner-editor.tsx](apps/web/src/features/banner/banner-editor.tsx), menu Pengaturan Banner. Mendukung 1–10 slide, urutan slide, upload gambar maksimal 5 MB, teks utama/emas, deskripsi, keterangan, tulisan dan tujuan tombol, serta pratinjau.
- **Frontend publik:** [hero-slider.tsx](apps/web/src/features/catalog/components/hero-slider.tsx), membaca `GET /api/banners`; interval otomatis tetap 5 detik. Jika API tidak tersedia, memakai konten awal dari `features/banner/defaults.json`.
- **Backend:** [banners.controller.ts](apps/api/src/banners.controller.ts). `PUT /api/admin/banners` dan `POST /api/admin/banners/images` dilindungi autentikasi admin. URL tombol hanya path lokal atau HTTPS. Pembaruan menggunakan nomor versi untuk mencegah perubahan saling menimpa.
- **Gambar publik:** `GET /api/banners/images/:id`.
- **Database:** `banner_content` dan `banner_images`; migrasi `npm run db:banners`, juga termasuk `db:setup`. Migrasi mengisi tiga slide awal tanpa menimpa pengaturan yang sudah ada.
- **Tes:** `node --test tests/banners.test.mjs`.

## Master Kategori

| Halaman / layanan | Lokasi |
| --- | --- |
| Admin `/master-kategori` | `apps/web/src/app/master-kategori/page.tsx` |
| Tambah kategori `/master-kategori/baru` | `apps/web/src/app/master-kategori/baru/page.tsx` |
| Edit kategori `/master-kategori/[name]/edit` | `apps/web/src/app/master-kategori/[name]/edit/page.tsx` |
| Form kategori pada halaman tersendiri | `apps/web/src/features/categories/category-form.tsx` |
| Popup pencarian ikon dari API Iconify | `apps/web/src/components/ui/icon-picker.tsx` |
| Ikon spesifikasi dan kelengkapan pada form/detail | `apps/web/src/components/ui/catalog-icon.tsx` |
| Form tambah/edit, ikon, urutan, tampil di beranda | `apps/web/src/features/categories/category-editor.tsx` |
| Data kategori dan ikon bersama | `apps/web/src/features/categories/categories.tsx` |
| API kategori | `apps/api/src/categories.controller.ts` |
| Tabel `asset_categories` | `scripts/setup-categories.mjs` |

GET `/api/categories` dipakai beranda, filter katalog, dan formulir aset. POST `/api/admin/categories` menambah kategori; PUT `/api/admin/categories/:name` mengubah label, ikon, urutan, dan visibilitas beranda. Kode kategori tetap agar hubungan dengan aset tidak berubah. Migrasi: `npm run db:categories` (juga bagian dari `db:setup`).

Pengaturan kategori juga mencakup template rumah, ruko, tanah, kendaraan, gudang/pabrik, dan umum; label deskripsi/dokumen/tombol; bagian detail aktif; kolom spesifikasi (teks, angka, dropdown), satuan, batas nilai, wajib isi, urutan, visibilitas detail/ringkasan; serta checklist kelengkapan. Editor berada di `apps/web/src/features/categories/category-settings-editor.tsx`; skema bersama dan template di `apps/api/src/category-settings.ts`. Form tambah/edit, preview, detail publik, dan ringkasan katalog mengikuti pengaturan ini. Nilai kolom tambahan disimpan di `assets.details.attributes`; nilai spesifikasi lama tetap dibaca. Migrasi tambahan `node scripts/setup-category-settings.mjs` menambahkan `asset_categories.settings` tanpa mengubah data aset lama. Menonaktifkan/menghapus kolom dari pengaturan menyembunyikan kolom, bukan menghapus nilai tersimpan; gunakan kode kolom yang sama untuk mengaktifkannya kembali.

### Filter Kelola Aset dan provinsi

- `/aset`: kategori, metode penjualan, provinsi, kota/kabupaten dari API wilayah, harga minimal/maksimal, status, serta pencarian. Filter dikombinasikan pada daftar aset admin.
- Logika filter: `apps/web/src/features/aset/filters.ts`.
- Sumber provinsi dan kabupaten/kota: [API Wilayah Indonesia v2](https://www.emsifa.com/api-wilayah-indonesia/). Pengambilan dan penyesuaian nama lama ada di `apps/web/src/features/aset/use-regions.ts` dan `regions.mjs`.
- Form tambah/edit menyimpan `province` pada tabel `assets`. Lokasi lama yang dikenali di Jawa Tengah diisi otomatis; lokasi lain dilengkapi admin.
- Migrasi instalasi lama: `npm run db:provinces`, lalu restart API. Migrasi juga termasuk `db:setup`.
