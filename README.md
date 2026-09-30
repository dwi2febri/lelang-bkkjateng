# Portal Lelang BKK Jateng

Aplikasi katalog lelang dengan Next.js App Router, React, TypeScript/TSX → NestJS/Node.js REST API → MySQL 8. Desain terinspirasi pola katalog https://lelang.bankmandiri.co.id/ dengan identitas visual tersendiri.

## Menjalankan secara lokal

Prasyarat: Node.js 24, npm, MySQL 8 yang berjalan pada port 3306.

```powershell
npm.cmd install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Sesuaikan koneksi MySQL pada .env bila diperlukan.
npm.cmd run db:setup
npm.cmd run dev
```

Buka http://localhost:3000. API tersedia pada http://127.0.0.1:3001/api/health. Next.js meneruskan `/api/*` ke NestJS sehingga browser menggunakan origin yang sama. `API_URL` dapat diatur pada environment proses Next.js sebelum build untuk deployment terpisah.

`db:setup` membuat database dan tabel jika belum ada, menambahkan delapan aset demo dengan `INSERT IGNORE`, lalu menjalankan migrasi admin. Data dan akun yang sudah ada tidak ditimpa. Kredensial MySQL lokal default: root tanpa password; ubah `.env` sesuai lingkungan.

## Login admin

Buka http://localhost:3000/login atau klik **Login Admin** pada portal publik. `/admin` mengarah ke `/dashboard`.

- Email awal: `admin@bkkjateng.local`, kecuali Anda mengatur `ADMIN_EMAIL` sendiri.
- Password awal: nilai `ADMIN_PASSWORD` pada `.env` di root proyek. Setup menghasilkan password acak jika belum ditetapkan; tidak ada password universal pada source code.
- Untuk proyek yang databasenya sudah tersedia, jalankan `npm.cmd run admin:setup` sekali sebelum menjalankan versi baru. Perintah ini aman dijalankan ulang dan tidak mengganti password akun yang sudah ada.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `ADMIN_NAME` digunakan saat provisioning akun, bukan dibaca untuk membandingkan password pada setiap login. Mengubah `.env` saja tidak mengganti password akun yang sudah tersimpan.

Password disimpan sebagai hash scrypt dengan salt unik. Sesi acak disimpan di cookie HttpOnly/SameSite=Strict selama delapan jam, sedangkan database hanya menyimpan hash token. Logout menghapus sesi di database. Endpoint admin dilindungi guard NestJS, halaman admin melakukan pemeriksaan sesi server-side, dan mutasi memerlukan header khusus serta pemeriksaan Origin. Login dibatasi sepuluh percobaan gagal per IP selama 15 menit pada proses API yang berjalan.

Konfigurasi origin lokal: `APP_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`. Untuk HTTPS, gunakan `COOKIE_SECURE=true`; pada `NODE_ENV=production`, cookie selalu Secure. Server Next.js `next start` lokal tetap dapat bekerja dengan cookie HTTP karena proses API lokal tidak dijalankan dengan `NODE_ENV=production`.

## Fitur

Data contoh tambahan tersedia untuk **Jual Beli** (3 aset) dan **Cessie** (3 aset), masing-masing mencakup rumah, ruko, dan tanah. Jalankan `npm.cmd run db:seed-sales` untuk menambahkannya ke database yang sudah dimigrasi. Seed ini juga dijalankan oleh `db:setup`, memakai kode `DEMO-JB-*` / `DEMO-CS-*`, dan tidak menimpa data atau edit admin jika diulang. Semua foto, harga, dokumen, dan tanggal pada aset tersebut adalah ilustrasi.

- Halaman publik terpisah: `/` untuk maksimal empat aset rekomendasi, `/katalog-aset` untuk katalog lengkap dengan filter dan paginasi, `/jadwal-lelang` untuk jadwal yang dikelompokkan per tanggal dalam WIB, dan `/favorit` untuk aset tersimpan.
- Rekomendasi beranda mengikuti pilihan **Prioritaskan sebagai aset unggulan** pada formulir admin. Jadwal dapat difilter menjadi mendatang, berlalu, atau semua jadwal.
- Form pencarian dan kartu kategori berada di beranda; keduanya mengarah ke `/katalog-aset` dengan query filter. Katalog memakai sidebar filter di kiri (di atas hasil pada layar kecil). Tombol Terapkan Filter menyimpan pilihan pada URL sehingga tetap terisi setelah refresh.
- Filter tambahan: metode penjualan **Jual Beli / Lelang / Cessie**, tag **Aset Unggulan / Turun Harga**, harga minimal dan maksimal dengan separator ribuan, serta tanggal awal–akhir lelang (inklusif per hari WIB). Query API: `saleMethod`, `tag=featured|discount`, `minPrice`, `maxPrice`, `dateFrom=YYYY-MM-DD`, `dateTo=YYYY-MM-DD`. Rentang terbalik ditolak. Metode aset diatur pada formulir admin; migrasi mengisi aset lama dengan `Lelang`. Tag Unggulan mengikuti checkbox unggulan; Turun Harga mengikuti harga sebelumnya yang lebih tinggi dari harga limit.
- Katalog dari MySQL, pencarian nama/kota/kode, kategori, lokasi, batas harga, serta pengurutan harga/jadwal.
- Detail aset, harga limit, luas, dokumen, jadwal, dan deskripsi.
- Favorit persisten pada localStorage browser.
- Jadwal lelang, panduan, FAQ, dan informasi penggunaan data.
- Jadwal lelang tersedia dalam tampilan Daftar dan Kalender bulanan, dengan navigasi bulan, filter periode, dan tautan detail aset.
- Formulir minat dengan validasi frontend/backend dan persetujuan, disimpan pada tabel `interests`.
- Tampilan responsif, loading, keadaan kosong, dan penanganan layanan tidak tersedia.
- Dashboard admin dengan jumlah aset aktif, pengajuan baru, dan jadwal mendatang dari database.
- Kelola aset: tambah, edit, arsip, dan pulihkan. Arsip menyembunyikan aset dari publik tanpa menghapus pengajuan terkait.
- Pengajuan minat: pencarian, filter status, paginasi, detail, dan pencatatan manual oleh admin.
- Tindak lanjut: status baru/diproses/selesai/ditolak, catatan, dan riwayat petugas. Penolakan memerlukan alasan. Versi data mencegah perubahan lama menimpa perubahan terbaru.
- Status tindak lanjut merupakan pencatatan komunikasi minat, bukan persetujuan transaksi atau penetapan pemenang lelang.

## Struktur

```text
apps/
├── web/                         Next.js / React / TypeScript
│   ├── src/
│   │   ├── app/                 Route tipis, layout, dan CSS
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/{page,layout,loading}.tsx
│   │   │   ├── pengajuan/       Daftar, [id], baru, layout
│   │   │   ├── aset/            Daftar, [id], baru, layout
│   │   │   ├── approval/        Tindak lanjut
│   │   │   ├── admin/page.tsx   Redirect ke dashboard
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx         Katalog publik
│   │   ├── components/
│   │   │   ├── ui/              Button, input, modal
│   │   │   └── layout/          Sidebar, navbar, footer, shell, proteksi
│   │   ├── features/
│   │   │   ├── auth/            Components, hooks, services, types, schemas
│   │   │   ├── pengajuan/       Components, hooks, services, types, schemas
│   │   │   ├── approval/        Components, services, types
│   │   │   ├── aset/            Components, services, types
│   │   │   ├── catalog/         Components, services, types
│   │   │   └── dashboard/       Komponen dashboard
│   │   ├── services/           API dan connector WebSocket opsional
│   │   ├── lib/                Axios, auth server, utils
│   │   ├── hooks/              use-auth, use-mobile
│   │   ├── store/              User sesi di memori dan notifikasi UI
│   │   ├── types/              Tipe global
│   │   └── config/             Konfigurasi environment frontend
│   ├── public/{images,icons,logo}/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json           Alias @/* → src/*
│   └── next.config.ts
└── api/src/                    NestJS / Node.js
    ├── auth/                   Controller, service, guard
    ├── admin/                  Controller admin dan DTO
    ├── database/               Pool MySQL
    ├── assets.controller.ts    API publik
    └── main.ts
scripts/{setup-db,setup-admin}.mjs
tests/{api,admin}.test.mjs
.env                            Koneksi MySQL dan provisioning admin
package.json                    npm workspaces dan script bersama
```

Struktur yang diminta diterapkan di `apps/web/src` agar frontend dan backend tetap terpisah dalam monorepo. Edit file di `src`, bukan `dist` atau `node_modules`. `dist` merupakan keluaran build, sedangkan `node_modules` dikelola npm.

`services/websocket.ts` hanya menyediakan connector opsional yang tidak berjalan tanpa konfigurasi. Belum ada layanan WebSocket atau notifikasi real-time; notifikasi pada UI adalah pesan hasil aksi lokal.

## API

| Metode | URL | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Memeriksa API dan koneksi database |
| GET | `/api/assets` | Katalog; query `q`, `category`, `city`, `maxPrice`, `sort` |
| GET | `/api/assets/:slug` | Detail aset |
| POST | `/api/assets/:slug/interests` | Menyimpan nama, email, telepon, pesan, consent |
| POST | `/api/auth/login` | Login email/password dan membuat sesi |
| GET | `/api/auth/me` | Membaca identitas sesi |
| POST | `/api/auth/logout` | Mencabut sesi |
| GET | `/api/admin/dashboard` | Statistik admin |
| GET, POST | `/api/admin/assets` | Daftar atau tambah aset |
| GET, PUT | `/api/admin/assets/:id` | Baca atau edit aset |
| PATCH | `/api/admin/assets/:id/archive` | Arsip/pulihkan aset |
| GET, POST | `/api/admin/pengajuan` | Daftar atau catat pengajuan |
| GET | `/api/admin/pengajuan/:id` | Detail dan riwayat pengajuan |
| PATCH | `/api/admin/pengajuan/:id/status` | Status, catatan, versi data |

Pilihan sort: `recommended`, `lowest`, `highest`, `soonest`. Semua input SQL menggunakan parameter terikat; pilihan urutan dibatasi whitelist. Detail yang tidak ada mengembalikan 404, input tidak valid 400, database tidak tersedia 503.

Katalog publik juga menerima `featured=true`, `period=upcoming|past|all`, `page`, dan `pageSize` (maksimal 200). Respons menyertakan total aset yang cocok, halaman, dan ukuran halaman. Perhitungan waktu jadwal mengikuti WIB.

## Verifikasi dan build

```powershell
npm.cmd run build
# Saat API, frontend, dan database berjalan:
npm.cmd test
```

Untuk menjalankan hasil build: `npm.cmd run start -w apps/api` dan `npm.cmd run start -w apps/web` pada terminal terpisah. Mode dev API mengompilasi saat mulai; setelah mengubah TypeScript API, jalankan ulang perintah dev agar terkompilasi kembali.

`npm.cmd run format` merapikan source dengan Prettier. Pengujian admin memakai akun `.env`, memeriksa login/logout, perlindungan route, cookie, CSRF, alur aset dan pengajuan, versi konflik, serta persistensi MySQL. Pengujian membuat data khusus sementara dan membersihkan hanya data tersebut.

## Batas versi ini

Ini merupakan aplikasi katalog dan pengajuan minat yang berfungsi, bukan mesin penawaran lelang. Seluruh aset, harga, jadwal, dan dokumen adalah contoh. Foto ilustrasi dimuat dari Unsplash; font dari Google Fonts dengan fallback lokal. Logo aplikasi menggunakan berkas yang disediakan di `apps/web/public/logo/bkk-lelang.png`.

Belum tersedia notifikasi email/WhatsApp, pembayaran, verifikasi peserta, bidding, pengelolaan banyak peran, reset password mandiri, atau upload gambar. Foto aset menggunakan URL HTTPS. Favorit tidak disinkronkan antarperangkat. Rate limit login tersimpan di memori satu proses; untuk deployment multi-instance diperlukan penyimpanan limiter bersama. Formulir minat publik belum memakai rate limit. Sebelum penggunaan publik, lengkapi data dan identitas resmi, kebijakan privasi/retensi, backup, TLS, dan pemantauan. Saat ini server hanya mendengarkan pada loopback untuk pengembangan lokal.


## Mengelola Panduan Lelang

Halaman publik: `/panduan-lelang`. Login admin lalu buka menu **Panduan Lelang** (`/kelola-panduan`). Tambahkan blok teks atau gambar, atur urutan, dan klik **Simpan Panduan** untuk menampilkan perubahan. Tersedia pratinjau sebelum menyimpan.

Untuk database lama, jalankan `npm.cmd run db:guide` sekali. Setup ini juga termasuk `db:setup` dan tidak menimpa panduan yang sudah diedit. Gambar PNG/JPG/WebP maksimal 5 MB disimpan di MySQL, sehingga backup harus mencakup tabel `guide_content` dan `guide_images`.

Statistik pengunjung footer menggunakan tabel `site_visits`. Untuk instalasi yang sudah berjalan, jalankan `npm run db:visitors`, lalu build/restart API. Pengunjung harian dihitung per browser per hari WIB; total adalah browser unik sejak fitur diaktifkan.

Pengaturan banner beranda tersedia di `/kelola-banner` untuk admin. Untuk database lama, jalankan `npm run db:banners`, lalu build/restart API. Admin dapat mengunggah gambar dan mengatur teks, tombol, serta urutan slide; perubahan tampil di beranda setelah disimpan.

Master kategori: jalankan `npm run db:categories` untuk menyiapkan tabel pada instalasi lama, lalu restart API. Admin dapat mengelola kategori lewat `/master-kategori`.

### Log User dan aktivitas langsung

Menu `/log-user` tersedia untuk admin, di atas Manajemen User. Jalankan `npm run db:user-logs` pada database instalasi lama, lalu `npm run build` dan restart API serta web. Setup baru melalui `npm run db:setup` sudah menyertakan tabel ini.

Browser yang terlihat mengirim heartbeat setiap 15 detik. Status aktif memiliki toleransi 75 detik; sesi akun yang logout, dinonaktifkan, atau kedaluwarsa tidak dihitung aktif. Daftar diperbarui setiap 15 detik dengan pencarian, filter aktif, dan paginasi. Kartu Aktif sekarang dan Browser tercatat membuka daftar browser dengan nama/IP serta status terbaru. Tabel utama menampilkan riwayat terpisah: membuka halaman, kembali aktif, perubahan sesi akun, dan pengajuan minat. Heartbeat rutin pada halaman yang sama tidak menambah riwayat; identitas setiap peristiwa disimpan sesuai waktu kejadian. Riwayat tidak merekonstruksi aktivitas sebelum fitur ini diaktifkan. Jalankan ulang `npm run db:user-logs` untuk menambahkan tabel `user_activity` pada instalasi yang sudah memiliki `user_presence`.

Identitas tamu menggunakan IP. Nama pengajuan ditautkan ke cookie browser setelah pengajuan berhasil; nama akun diambil dari sesi server saat login. Pengajuan lama sebelum fitur ini dipasang tidak dapat ditautkan otomatis ke browser. Penghapusan cookie atau perangkat berbeda menghasilkan catatan browser baru.

API mempercayai proxy loopback untuk alamat IP. Di production, proxy lokal harus meneruskan IP klien melalui X-Forwarded-For dengan benar; API tetap mendengarkan pada 127.0.0.1. Endpoint daftar log dilindungi sesi admin dan tidak menyertakan token sesi. Waktu log disimpan dalam UTC dan ditampilkan sebagai WIB.

### Master Produk Kredit

Menu `/master-produk-kredit` menyediakan tambah/edit produk, status ketersediaan untuk pilihan baru, aturan tenor dalam bulan, bunga tahunan flat/anuitas, serta kelompok pegawai internal/eksternal. Lima produk awal (BKK Mikro, Agrari, Joglo, Migunani, Makaryo) diimpor dari file referensi pengguna `kalkulator_kredit_bkk_export_excel_v2 (1).html`, bukan diambil dari informasi bunga terbaru di internet. Data awal ada di `scripts/data/credit-products.json`; setup ulang tidak menimpa perubahan master.

Pada instalasi lama, jalankan `npm run db:credit-products`, kemudian `npm run build` dan restart API serta web. Instalasi baru sudah menyertakannya pada `db:setup`. Di form aset, pilih Produk kredit untuk aset pada Pengaturan katalog lalu simpan. Produk yang dipilih menentukan simulasi, rincian angsuran, dan teks tombol Ajukan. Aset lama tidak dipasangkan ke produk secara otomatis. Tanpa produk, simulasi umum dan pengaturan kategori tetap digunakan.

Bunga kosong pada suatu metode berarti metode tersebut tidak tersedia; bunga 0 berarti tanpa bunga. Rentang tenor divalidasi berurutan, tanpa celah atau tumpang tindih. Simulasi membatasi masukan teknis sampai 1.200 bulan dan Rp1 triliun, bukan pernyataan batas persetujuan kredit. Perubahan master berlaku pada semua aset terkait. Menonaktifkan produk mencegah pemilihan baru, tetapi tidak menghapus kaitan aset lama. Hasil simulasi tidak disimpan sebagai pengajuan kredit; tombol Ajukan menuju formulir minat aset yang sudah ada.

Data dummy dapat dihubungkan ke produk kredit dengan `npm run db:demo-credit-products` setelah master produk tersedia. Perintah ini memperbarui hanya pasangan kode/slug dari seed: Kendaraan memakai BKK Migunani, kategori lainnya memakai BKK Joglo. Jalankan kembali setelah menambahkan seed katalog; pilihan produk pada aset dummy yang cocok akan disesuaikan kembali.

Daftar Aset mendukung 10, 25, 50, atau 100 baris per halaman dan opsi Tampilkan semua. Pilihan semua mengikuti filter aktif; ringkasan nilai tetap menghitung seluruh hasil filter, bukan hanya halaman saat ini.
