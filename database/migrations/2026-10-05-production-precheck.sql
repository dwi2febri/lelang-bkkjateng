-- Hanya membaca metadata dan memeriksa kategori. Tidak mengubah data.
USE `sql_lelang_bkkjateng`;
SELECT DATABASE() AS database_target, VERSION() AS mysql_version;

-- HARUS KOSONG. Jika ada baris, cocokkan aset tersebut ke kategori yang benar
-- melalui aplikasi sebelum menjalankan file production-update.sql.
SELECT a.category AS kategori_tidak_terdaftar, COUNT(*) AS jumlah_aset
FROM assets AS a
LEFT JOIN asset_categories AS c ON c.name=a.category
WHERE c.name IS NULL
GROUP BY a.category;

-- Kedua kolom relasi harus kompatibel (dump: varchar(30), utf8mb4_unicode_ci).
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE()
  AND ((TABLE_NAME='assets' AND COLUMN_NAME='category')
    OR (TABLE_NAME='asset_categories' AND COLUMN_NAME='name'));

-- Jika sudah pernah migrasi, periksa objek yang sudah ada.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE()
  AND ((TABLE_NAME IN ('assets','interests') AND COLUMN_NAME='deleted_at')
    OR (TABLE_NAME='credit_products' AND COLUMN_NAME='used_at'));

SELECT TRIGGER_NAME, ACTION_STATEMENT
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA=DATABASE()
  AND TRIGGER_NAME IN ('assets_credit_usage_insert','assets_credit_usage_update');
