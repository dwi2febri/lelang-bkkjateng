import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lelang_bkkjateng",
});

// Kode tetap membuat seed dapat dijalankan ulang tanpa menimpa edit admin.
const assets = [
  {
    code: "DEMO-JB-001",
    slug: "demo-jual-beli-rumah-tembalang",
    title: "Rumah Minimalis Tembalang (Demo)",
    category: "Rumah",
    city: "Semarang",
    address: "Tembalang, Kota Semarang, Jawa Tengah",
    price: 495000000,
    oldPrice: 550000000,
    land: 120,
    building: 90,
    bedrooms: 3,
    certificate: "SHM",
    photo: "photo-1600596542815-ffad4c1539a9",
    date: "2026-11-03 10:00:00",
    method: "Jual Beli",
    featured: true,
  },
  {
    code: "DEMO-JB-002",
    slug: "demo-jual-beli-ruko-laweyan",
    title: "Ruko Dua Lantai Laweyan (Demo)",
    category: "Ruko",
    city: "Surakarta",
    address: "Laweyan, Kota Surakarta, Jawa Tengah",
    price: 875000000,
    oldPrice: null,
    land: 100,
    building: 180,
    bedrooms: 0,
    certificate: "SHGB",
    photo: "photo-1518005020951-eccb494ad742",
    date: "2026-11-05 09:00:00",
    method: "Jual Beli",
    featured: false,
  },
  {
    code: "DEMO-JB-003",
    slug: "demo-jual-beli-tanah-kendal",
    title: "Tanah Kavling Kaliwungu (Demo)",
    category: "Tanah",
    city: "Kendal",
    address: "Kaliwungu, Kabupaten Kendal, Jawa Tengah",
    price: 225000000,
    oldPrice: 260000000,
    land: 250,
    building: 0,
    bedrooms: 0,
    certificate: "SHM",
    photo: "photo-1500382017468-9049fed747ef",
    date: "2026-11-07 10:00:00",
    method: "Jual Beli",
    featured: false,
  },
  {
    code: "DEMO-CS-001",
    slug: "demo-cessie-agunan-rumah-banyumas",
    title: "Cessie — Agunan Rumah Purwokerto (Demo)",
    category: "Rumah",
    city: "Banyumas",
    address: "Purwokerto Selatan, Kabupaten Banyumas, Jawa Tengah",
    price: 325000000,
    oldPrice: 400000000,
    land: 140,
    building: 100,
    bedrooms: 3,
    certificate: "SHM",
    photo: "photo-1600585154340-be6161a56a0c",
    date: "2026-11-10 09:00:00",
    method: "Cessie",
    featured: true,
  },
  {
    code: "DEMO-CS-002",
    slug: "demo-cessie-agunan-ruko-pekalongan",
    title: "Cessie — Agunan Ruko Pekalongan (Demo)",
    category: "Ruko",
    city: "Pekalongan",
    address: "Pekalongan Timur, Kota Pekalongan, Jawa Tengah",
    price: 650000000,
    oldPrice: null,
    land: 110,
    building: 200,
    bedrooms: 0,
    certificate: "SHGB",
    photo: "photo-1497366754035-f200968a6e72",
    date: "2026-11-12 10:00:00",
    method: "Cessie",
    featured: false,
  },
  {
    code: "DEMO-CS-003",
    slug: "demo-cessie-agunan-tanah-karanganyar",
    title: "Cessie — Agunan Tanah Colomadu (Demo)",
    category: "Tanah",
    city: "Karanganyar",
    address: "Colomadu, Kabupaten Karanganyar, Jawa Tengah",
    price: 185000000,
    oldPrice: 220000000,
    land: 300,
    building: 0,
    bedrooms: 0,
    certificate: "SHM",
    photo: "photo-1500382017468-9049fed747ef",
    date: "2026-11-14 10:00:00",
    method: "Cessie",
    featured: false,
  },
];

let added = 0;
try {
  await db.beginTransaction();
  for (const a of assets) {
    const [existing] = await db.execute(
      "SELECT id FROM assets WHERE code = ? OR slug = ?",
      [a.code, a.slug],
    );
    if (existing.length) continue;
    const description = `DATA DUMMY untuk pengujian filter metode ${a.method}. Foto, lokasi, harga, dokumen, dan tanggal merupakan ilustrasi, bukan penawaran atau jadwal resmi. ${a.method === "Cessie" ? "Contoh ini menggambarkan pengalihan hak tagih dengan agunan terkait, bukan penjualan langsung kepemilikan properti." : "Contoh aset untuk pengujian katalog penjualan langsung."} Tanggal pada sistem hanya digunakan untuk demonstrasi filter tanggal.`;
    await db.execute(
      "INSERT INTO assets (slug,code,title,category,city,address,price,oldPrice,land,building,bedrooms,image,auctionDate,certificate,description,featured,saleMethod) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        a.slug,
        a.code,
        a.title,
        a.category,
        a.city,
        a.address,
        a.price,
        a.oldPrice,
        a.land,
        a.building,
        a.bedrooms,
        `https://images.unsplash.com/${a.photo}?auto=format&fit=crop&w=1000&q=85`,
        a.date,
        a.certificate,
        description,
        a.featured,
        a.method,
      ],
    );
    added++;
  }
  await db.commit();
  console.log(
    `${added} aset dummy ditambahkan (${assets.length - added} sudah tersedia). Data lama tidak diubah.`,
  );
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
