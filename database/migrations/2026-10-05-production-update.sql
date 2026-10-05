-- Pembaruan production berdasarkan dump sql_lelang_bkkjateng.sql.
-- Dibandingkan dengan database lokal pada 5 Oktober 2026.
-- Target: MySQL 8.0.36 (CREATE TRIGGER IF NOT EXISTS membutuhkan >= 8.0.29).
-- Tidak mengimpor data lokal, menghapus tabel, atau mengganti data bisnis.
-- Backup database terlebih dahulu dan hentikan sementara penulisan aplikasi.
-- Jalankan file 2026-10-05-production-precheck.sql terlebih dahulu.
-- Jika query kategori_tidak_terdaftar mengembalikan baris, perbaiki pemetaannya dahulu.
-- DDL MySQL melakukan implicit commit: jangan mengandalkan ROLLBACK.
-- Dapat dijalankan ulang: objek yang sudah ada tidak dibuat ulang.
-- Dibutuhkan izin ALTER, INDEX, REFERENCES, TRIGGER, SELECT, UPDATE.

USE `sql_lelang_bkkjateng`;
SET SESSION foreign_key_checks = 1;

-- Relasi kategori aset
SET @bkk_migration_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='assets' AND CONSTRAINT_NAME='assets_category_fk' AND CONSTRAINT_TYPE='FOREIGN KEY'),
  'SELECT ''Sudah tersedia: Relasi kategori aset'' AS info',
  'ALTER TABLE `assets` ADD CONSTRAINT `assets_category_fk` FOREIGN KEY (`category`) REFERENCES `asset_categories` (`name`)'
);
PREPARE bkk_migration_stmt FROM @bkk_migration_sql;
EXECUTE bkk_migration_stmt;
DEALLOCATE PREPARE bkk_migration_stmt;

-- assets.deleted_at
SET @bkk_migration_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assets' AND COLUMN_NAME='deleted_at'),
  'SELECT ''Sudah tersedia: assets.deleted_at'' AS info',
  'ALTER TABLE `assets` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL'
);
PREPARE bkk_migration_stmt FROM @bkk_migration_sql;
EXECUTE bkk_migration_stmt;
DEALLOCATE PREPARE bkk_migration_stmt;

-- interests.deleted_at
SET @bkk_migration_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interests' AND COLUMN_NAME='deleted_at'),
  'SELECT ''Sudah tersedia: interests.deleted_at'' AS info',
  'ALTER TABLE `interests` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL'
);
PREPARE bkk_migration_stmt FROM @bkk_migration_sql;
EXECUTE bkk_migration_stmt;
DEALLOCATE PREPARE bkk_migration_stmt;

-- credit_products.used_at
SET @bkk_migration_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='credit_products' AND COLUMN_NAME='used_at'),
  'SELECT ''Sudah tersedia: credit_products.used_at'' AS info',
  'ALTER TABLE `credit_products` ADD COLUMN `used_at` DATETIME NULL DEFAULT NULL'
);
PREPARE bkk_migration_stmt FROM @bkk_migration_sql;
EXECUTE bkk_migration_stmt;
DEALLOCATE PREPARE bkk_migration_stmt;

-- Index assets_deleted_at
SET @bkk_migration_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assets' AND INDEX_NAME='assets_deleted_at'),
  'SELECT ''Sudah tersedia: Index assets_deleted_at'' AS info',
  'ALTER TABLE `assets` ADD INDEX `assets_deleted_at` (`deleted_at`)'
);
PREPARE bkk_migration_stmt FROM @bkk_migration_sql;
EXECUTE bkk_migration_stmt;
DEALLOCATE PREPARE bkk_migration_stmt;

-- Index interests_deleted_at
SET @bkk_migration_sql = IF(
  EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interests' AND INDEX_NAME='interests_deleted_at'),
  'SELECT ''Sudah tersedia: Index interests_deleted_at'' AS info',
  'ALTER TABLE `interests` ADD INDEX `interests_deleted_at` (`deleted_at`)'
);
PREPARE bkk_migration_stmt FROM @bkk_migration_sql;
EXECUTE bkk_migration_stmt;
DEALLOCATE PREPARE bkk_migration_stmt;

-- Index assets_category_fk dibuat otomatis oleh MySQL saat relasi ditambahkan.
-- Trigger tetap mencatat pemakaian setelah produk dilepas dari aset.
-- Tidak memakai DEFINER dari lokal: pemilik trigger adalah akun pemasang di production.
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS `assets_credit_usage_insert`
AFTER INSERT ON `assets`
FOR EACH ROW
BEGIN
  IF NEW.creditProductId IS NOT NULL THEN
    UPDATE credit_products
    SET used_at = COALESCE(used_at, NOW())
    WHERE id = NEW.creditProductId;
  END IF;
END$$

CREATE TRIGGER IF NOT EXISTS `assets_credit_usage_update`
AFTER UPDATE ON `assets`
FOR EACH ROW
BEGIN
  IF NEW.creditProductId IS NOT NULL THEN
    UPDATE credit_products
    SET used_at = COALESCE(used_at, NOW())
    WHERE id = NEW.creditProductId;
  END IF;
END$$

DELIMITER ;

-- Tandai produk yang saat ini digunakan, termasuk oleh aset arsip.
-- used_at lama dan updated_at produk tetap dipertahankan.
-- Pemakaian yang telah dilepas sebelum migrasi tidak tersedia pada skema lama.
UPDATE credit_products AS p
SET p.used_at = COALESCE(p.used_at, NOW()), p.updated_at = p.updated_at
WHERE p.used_at IS NULL
  AND EXISTS (SELECT 1 FROM assets AS a WHERE a.creditProductId = p.id);

-- Verifikasi: hasil normal 3 kolom, 3 index, 1 foreign key, dan 2 trigger.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE()
  AND ((TABLE_NAME IN ('assets','interests') AND COLUMN_NAME='deleted_at')
    OR (TABLE_NAME='credit_products' AND COLUMN_NAME='used_at'))
ORDER BY TABLE_NAME;

SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA=DATABASE()
  AND ((TABLE_NAME='assets' AND INDEX_NAME IN ('assets_deleted_at','assets_category_fk'))
    OR (TABLE_NAME='interests' AND INDEX_NAME='interests_deleted_at'))
ORDER BY TABLE_NAME, INDEX_NAME;

SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='assets'
  AND CONSTRAINT_NAME='assets_category_fk';

SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA=DATABASE()
  AND TRIGGER_NAME IN ('assets_credit_usage_insert','assets_credit_usage_update');

SELECT COUNT(*) AS produk_terpakai_belum_ditandai
FROM credit_products AS p
WHERE p.used_at IS NULL
  AND EXISTS (SELECT 1 FROM assets AS a WHERE a.creditProductId=p.id);
-- Hasil produk_terpakai_belum_ditandai harus 0.
