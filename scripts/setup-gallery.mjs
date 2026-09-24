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
try {
  await db.query(
    `CREATE TABLE IF NOT EXISTS asset_photos (id INT AUTO_INCREMENT PRIMARY KEY, asset_id INT NOT NULL, url VARCHAR(1000) NOT NULL, position INT NOT NULL, UNIQUE KEY asset_position (asset_id, position), FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE)`,
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS asset_views (asset_id INT NOT NULL, visitor_id CHAR(36) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(asset_id, visitor_id), FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE)`,
  );
  const pools = {
    Rumah: [
      "photo-1600607687920-4e2a09cf159d",
      "photo-1600585154340-be6161a56a0c",
      "photo-1600596542815-ffad4c1539a9",
    ],
    Ruko: [
      "photo-1497366754035-f200968a6e72",
      "photo-1486406146926-c627a92ad1ab",
      "photo-1518005020951-eccb494ad742",
    ],
    Gudang: [
      "photo-1497366754035-f200968a6e72",
      "photo-1486406146926-c627a92ad1ab",
      "photo-1518005020951-eccb494ad742",
    ],
    Tanah: ["photo-1500382017468-9049fed747ef"],
    Kendaraan: ["photo-1494976388531-d1058494cdd8"],
  };
  const [assets] = await db.query(
    "SELECT id,code,category,image FROM assets WHERE code REGEXP '^BKK-000[1-8]$' OR code REGEXP '^DEMO-(JB|CS)-00[1-3]$'",
  );
  for (const asset of assets) {
    const extra = pools[asset.category] || pools.Rumah;
    const photos = [
      ...new Set([
        asset.image,
        ...extra.map(
          (id) =>
            `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=85`,
        ),
      ]),
    ];
    // Insert missing demo photos only; never replace photographs edited later.
    for (const [index, url] of photos.entries())
      await db.execute(
        "INSERT IGNORE INTO asset_photos(asset_id,url,position) VALUES(?,?,?)",
        [asset.id, url, index],
      );
  }
  console.log(
    `Galeri demo siap untuk ${assets.length} aset; statistik dimulai dari aktivitas aktual.`,
  );
} finally {
  await db.end();
}
