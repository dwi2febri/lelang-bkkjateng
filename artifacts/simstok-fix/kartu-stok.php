<?php
/*********************************************************
 * FILE    : pages/stok/kartu-stok.php
 * VERSION : v3.1 (2026-02-12) - FIX FINAL: serial per-baris (1 ref_doc bisa banyak batch)
 * PURPOSE : Kartu Stok per Item per Cabang / per Kankas
 *
 * FIX UTAMA:
 * - Serial range sebelumnya bisa tampil SAMA pada banyak baris OUT/IN karena:
 *   join serial dibuat 1 row per (ref_doc + id_barang) -> seri_join berisi banyak range,
 *   tapi saat tampil hanya diambil range pertama (preg_match) -> hasilnya duplikat.
 *
 * SOLUSI v3.1:
 * - seri_join di GROUP_CONCAT dibuat TERURUT (by serial_awal/akhir jika ada).
 * - saat render tabel, nomor seri di-ALOKASI PER BARIS berdasarkan QTY:
 *   baris pertama ambil range pertama sesuai qty, baris berikutnya lanjut range berikutnya, dst.
 *
 * MODE FILTER:
 *   id_kankas = ''  => ALL (cabang + semua kankas di cabang tsb)
 *   id_kankas = 0   => Tanpa kankas (stok cabang saja)
 *   id_kankas > 0   => Kankas tertentu (PK tb_kankas.id_kankas)
 *********************************************************/

if (session_id()==='') session_start();
require_once __DIR__ . '/../../config/auth.php';
require_login();
require_once __DIR__ . '/../../config/koneksi.php';
require_once __DIR__ . '/../../config/helper.php';

/* =========================
   Helpers aman
   ========================= */
if (!function_exists('safe_str')) {
  function safe_str($v){ return (string)($v ?? ''); }
}
if (!function_exists('safe_trim')) {
  function safe_trim($v){ return trim(safe_str($v)); }
}
if (!function_exists('h')) {
  function h($s){ return htmlspecialchars((string)($s ?? ''), ENT_QUOTES, 'UTF-8'); }
}

/* ===== Helper: cek tabel/kolom ada/tidak ===== */
function table_exists_local($koneksi, $table){
    $table_safe = mysqli_real_escape_string($koneksi, $table);
    $q = mysqli_query($koneksi, "SHOW TABLES LIKE '".$table_safe."'");
    return ($q && mysqli_num_rows($q) > 0);
}
function table_has_column_local($koneksi, $table, $column) {
    $table_safe  = mysqli_real_escape_string($koneksi, $table);
    $col_safe    = mysqli_real_escape_string($koneksi, $column);
    $q = mysqli_query($koneksi, "SHOW COLUMNS FROM `".$table_safe."` LIKE '".$col_safe."'");
    return ($q && mysqli_num_rows($q) > 0);
}
function first_existing_column_local($koneksi, $table, $candidates){
    foreach ($candidates as $c){
        if (table_has_column_local($koneksi, $table, $c)) return $c;
    }
    return '';
}

/* ======================================================
 * AUTO BUILD SERIAL SUBQUERY (IN / OUT) by ref_doc + id_barang
 * ====================================================== */
function build_serial_subquery_local($koneksi, $kind){
    // $kind: 'IN' => cari dari tabel masuk, 'OUT' => cari dari tabel keluar
    $kind = strtoupper(trim($kind));

    $detailCandidates = array();
    $masterTable = '';
    $masterPkCandidates = array();
    $detailFkCandidates = array();

    if ($kind === 'IN') {
        $detailCandidates = array(
            'tb_trans_masuk_detail','tb_trans_masuk_det','tb_trans_masuk_item','tb_trans_masuk_items',
            'tb_trans_masuk_barang','tb_trans_masuk_brg','tb_trans_masuk'
        );
        $masterTable = 'tb_trans_masuk';
        $masterPkCandidates = array('id_trans_masuk','id_masuk','id_trans','id','id_header');
        $detailFkCandidates = array('id_trans_masuk','id_masuk','id_header','id_trans','id_hdr','id_head');
    } else {
        $detailCandidates = array(
            'tb_trans_keluar_detail','tb_trans_keluar_det','tb_trans_keluar_item','tb_trans_keluar_items',
            'tb_trans_keluar_barang','tb_trans_keluar_brg','tb_trans_keluar'
        );
        $masterTable = 'tb_trans_keluar';
        $masterPkCandidates = array('id_trans_keluar','id_keluar','id_trans','id','id_header');
        $detailFkCandidates = array('id_trans_keluar','id_keluar','id_header','id_trans','id_hdr','id_head');
    }

    // kandidat kolom umum
    $idBarangCandidates  = array('id_barang','barang_id','id_brg');
    $refDocCandidates    = array('ref_doc','ref_dok','refdok','ref','no_dokumen','no_doc','dok_ref','ref_dokumen');

    $startCandidates = array(
        'serial_awal','seri_awal','no_seri_awal','nomor_seri_awal','range_awal','start_serial','nomor_awal',
        'awal_seri','awal_serial'
    );
    $endCandidates = array(
        'serial_akhir','seri_akhir','no_seri_akhir','nomor_seri_akhir','range_akhir','end_serial','nomor_akhir',
        'akhir_seri','akhir_serial'
    );
    $singleCandidates = array(
        'no_seri','nomor_seri','serial','serial_no','range_seri','serial_range','seri','no_seri_range','seri_range'
    );
    $ketCandidates = array(
        'keterangan','ket','note','catatan','keterangan_seri','ket_seri','keterangan_barang','keterangan_detail'
    );

    foreach ($detailCandidates as $dtable) {
        if (!table_exists_local($koneksi, $dtable)) continue;

        $id_barang_col = first_existing_column_local($koneksi, $dtable, $idBarangCandidates);
        if ($id_barang_col === '') continue;

        // ref_doc langsung di detail?
        $ref_col = first_existing_column_local($koneksi, $dtable, $refDocCandidates);

        $joinToMaster = '';
        $refExpr = '';

        if ($ref_col !== '') {
            $refExpr = "d.`".$ref_col."`";
        } else {
            // coba join ke master (kalau detail tidak punya ref_doc)
            if (!table_exists_local($koneksi, $masterTable)) continue;

            $master_ref_col = first_existing_column_local($koneksi, $masterTable, $refDocCandidates);
            if ($master_ref_col === '') continue;

            $master_pk = first_existing_column_local($koneksi, $masterTable, $masterPkCandidates);
            $detail_fk = first_existing_column_local($koneksi, $dtable, $detailFkCandidates);
            if ($master_pk === '' || $detail_fk === '') continue;

            $joinToMaster = " JOIN `".$masterTable."` h ON h.`".$master_pk."` = d.`".$detail_fk."` ";
            $refExpr = "h.`".$master_ref_col."`";
        }

        $start_col  = first_existing_column_local($koneksi, $dtable, $startCandidates);
        $end_col    = first_existing_column_local($koneksi, $dtable, $endCandidates);
        $single_col = first_existing_column_local($koneksi, $dtable, $singleCandidates);
        $ket_col    = first_existing_column_local($koneksi, $dtable, $ketCandidates);

        // kalau benar-benar tidak ada data serial apapun, skip
        if ($start_col==='' && $end_col==='' && $single_col==='' && $ket_col==='') continue;

        // CASE expression (hanya pakai kolom yang ada)
        $caseParts = array();
        if ($start_col!=='' && $end_col!=='') {
            $caseParts[] = "WHEN d.`".$start_col."` IS NOT NULL AND d.`".$end_col."` IS NOT NULL
                             AND d.`".$start_col."`<>'' AND d.`".$end_col."`<>''
                             AND d.`".$start_col."`<>'0' AND d.`".$end_col."`<>'0'
                            THEN CONCAT(d.`".$start_col."`,' s/d ',d.`".$end_col."`)";
        }
        if ($single_col!=='') {
            $caseParts[] = "WHEN d.`".$single_col."` IS NOT NULL AND d.`".$single_col."`<>'' AND d.`".$single_col."`<>'0'
                            THEN d.`".$single_col."`";
        }
        if ($ket_col!=='') {
            $caseParts[] = "WHEN d.`".$ket_col."` IS NOT NULL AND d.`".$ket_col."`<>'' THEN d.`".$ket_col."`";
        }

        $caseExpr = "CASE ".implode(" ", $caseParts)." ELSE '' END";

        // ORDER BY untuk GROUP_CONCAT supaya seri_join terurut rapi
        $gcOrder = '';
        if ($start_col !== '' && $end_col !== '') {
            $gcOrder = " ORDER BY
                CAST(NULLIF(d.`".$start_col."`,'0') AS UNSIGNED) ASC,
                CAST(NULLIF(d.`".$end_col."`,'0') AS UNSIGNED) ASC
            ";
        } elseif ($start_col !== '') {
            $gcOrder = " ORDER BY
                CAST(NULLIF(d.`".$start_col."`,'0') AS UNSIGNED) ASC
            ";
        }

        // subquery final
        $sub = "
            SELECT
              ".$refExpr." AS ref_doc,
              d.`".$id_barang_col."` AS id_barang,
              ".($start_col!=='' ? "MIN(NULLIF(d.`".$start_col."`,'0')) AS serial_awal," : "NULL AS serial_awal,")."
              ".($end_col!==''   ? "MAX(NULLIF(d.`".$end_col."`,'0')) AS serial_akhir," : "NULL AS serial_akhir,")."
              ".($single_col!==''? "MAX(NULLIF(d.`".$single_col."`,'')) AS serial_str," : "NULL AS serial_str,")."
              ".($ket_col!==''   ? "MAX(NULLIF(d.`".$ket_col."`,'')) AS serial_ket," : "NULL AS serial_ket,")."
              GROUP_CONCAT(
                DISTINCT NULLIF(TRIM(".$caseExpr."),'')
                ".$gcOrder."
                SEPARATOR '; '
              ) AS seri_join
            FROM `".$dtable."` d
            ".$joinToMaster."
            WHERE ".$refExpr." IS NOT NULL AND ".$refExpr." <> ''
            GROUP BY ".$refExpr.", d.`".$id_barang_col."`
        ";

        return $sub;
    }

    return '';
}

$has_keluar_id_kankas_asal = table_has_column_local($koneksi, 'tb_trans_keluar', 'id_kankas_asal');
$has_keluar_id_kankas_tuju = table_has_column_local($koneksi, 'tb_trans_keluar', 'id_kankas_tuju');

/* === Context user === */
$role_user     = isset($_SESSION['role']) ? strtoupper(safe_trim($_SESSION['role'])) : '';
$id_cbg_usr    = isset($_SESSION['id_cabang']) ? intval($_SESSION['id_cabang']) : 0;
$id_user_login = isset($_SESSION['id_user']) ? intval($_SESSION['id_user']) : 0;

/* ROLE FLAG */
$is_kankas_like = in_array($role_user, array('KANKAS','CS_KANKAS'));
$is_cabang_like = in_array($role_user, array('CABANG','CS'));

/* === Ambil filter GET === */
$id_cabang = isset($_GET['id_cabang']) ? intval($_GET['id_cabang']) : 0;
$id_barang = isset($_GET['id_barang']) ? intval($_GET['id_barang']) : 0;
$from      = isset($_GET['from']) ? safe_trim($_GET['from']) : '';
$to        = isset($_GET['to'])   ? safe_trim($_GET['to'])   : '';

/* Filter kankas: string (biar bisa ''), nanti int untuk query */
$id_kankas_raw = isset($_GET['id_kankas']) ? safe_trim((string)$_GET['id_kankas']) : ''; // '', '0', '12'
$id_kankas_int = ($id_kankas_raw === '' ? null : intval($id_kankas_raw));

/* === Lock cabang kalau role CABANG / CS === */
if ($is_cabang_like && $id_cbg_usr>0) {
    $id_cabang = $id_cbg_usr;
}

/* === LOCK kalau role KANKAS / CS_KANKAS:
   map tb_user.id_kankas (kode simpeg) -> tb_kankas.id_kankas (PK) */
if ($is_kankas_like && $id_user_login > 0) {
    $qmap = mysqli_query($koneksi, "
        SELECT kk.id_kankas, kk.id_cabang, kk.kode_kankas_simpeg
        FROM tb_user u
        JOIN tb_kankas kk
          ON kk.kode_kankas_simpeg = u.id_kankas
         AND kk.aktif = 1
        WHERE u.id_user = ".$id_user_login."
        LIMIT 1
    ");
    if ($qmap && mysqli_num_rows($qmap) > 0) {
        $rm = mysqli_fetch_assoc($qmap);
        $id_cabang     = intval($rm['id_cabang']);
        $id_kankas_int = intval($rm['id_kankas']);
        $id_kankas_raw = (string)$id_kankas_int;
    }
}

/* Tentukan mode filter kankas */
$kankas_mode = 'ALL'; // '' default ALL
if ($id_kankas_raw !== '') {
    if (intval($id_kankas_raw) === 0) $kankas_mode = 'CABANG_ONLY';
    else $kankas_mode = 'KANKAS_ONLY';
}

/* ALT match: kalau tb_mutasi.id_kankas kadang tersimpan sebagai kode_kankas_simpeg */
$kankas_alt_simpeg = 0;
if ($id_kankas_int !== null && $id_kankas_int > 0) {
    $qAlt = mysqli_query($koneksi, "SELECT kode_kankas_simpeg FROM tb_kankas WHERE id_kankas=".(int)$id_kankas_int." LIMIT 1");
    if ($qAlt && ($rAlt = mysqli_fetch_assoc($qAlt))) {
        $kankas_alt_simpeg = (int)($rAlt['kode_kankas_simpeg'] ?? 0);
    }
}

/* dropdown cabang */
$cabang_list = array();
$qcab = mysqli_query($koneksi,"
    SELECT id_cabang, kode_cabang, nama_cabang
    FROM tb_cabang
    WHERE aktif=1
    ORDER BY kode_cabang ASC, nama_cabang ASC
");
while($qcab && $rc=mysqli_fetch_assoc($qcab)){
    if ($is_cabang_like && intval($rc['id_cabang'])!=$id_cbg_usr) continue;
    if ($is_kankas_like && $id_cabang>0 && intval($rc['id_cabang'])!=$id_cabang) continue;
    $cabang_list[] = $rc;
}

/* Dropdown kankas (sesuai cabang terpilih) */
$kankas_list = array();
if ($id_cabang > 0) {
    $qkk = mysqli_query($koneksi,"
        SELECT id_kankas, kode_kankas_simpeg, nama_kankas
        FROM tb_kankas
        WHERE aktif=1
          AND id_cabang = ".intval($id_cabang)."
        ORDER BY nama_kankas ASC
    ");
    while($qkk && $rk=mysqli_fetch_assoc($qkk)){
        $kankas_list[] = $rk;
    }
}

/* Dropdown barang */
$barang_list = array();
$qBrg = mysqli_query($koneksi,"
    SELECT id_barang,kode_barang,nama_barang,satuan
    FROM tb_barang
    WHERE aktif=1
    ORDER BY nama_barang
");
while($qBrg && $rBrg=mysqli_fetch_assoc($qBrg)){
    $barang_list[] = $rBrg;
}

/* ======================================================
 * JOIN tk (1 baris per ref_doc) - FIX DUPLIKASI
 * ====================================================== */
$tk_subquery = "
  SELECT
    ref_doc,
    MAX(mode_keluar)      AS mode_keluar,
    MAX(id_cabang_asal)   AS id_cabang_asal,
    MAX(id_cabang_tuju)   AS id_cabang_tuju,
    ".($has_keluar_id_kankas_tuju ? "MAX(id_kankas_tuju) AS id_kankas_tuju," : "NULL AS id_kankas_tuju,")."
    ".($has_keluar_id_kankas_asal ? "MAX(id_kankas_asal) AS id_kankas_asal," : "NULL AS id_kankas_asal,")."
    MAX(id_penerima_tuju) AS id_penerima_tuju,
    MAX(penerima_nama)    AS penerima_nama
  FROM tb_trans_keluar
  WHERE ref_doc IS NOT NULL AND ref_doc <> ''
  GROUP BY ref_doc
";

/* ======================================================
 * SERIAL SUBQUERY (AUTO-DETECT)
 * ====================================================== */
$serial_in_sub  = build_serial_subquery_local($koneksi, 'IN');
$serial_out_sub = build_serial_subquery_local($koneksi, 'OUT');

$select_serial_in  = "NULL AS sin_serial_awal, NULL AS sin_serial_akhir, NULL AS sin_serial_str, NULL AS sin_serial_ket, NULL AS sin_seri_join";
$select_serial_out = "NULL AS sout_serial_awal, NULL AS sout_serial_akhir, NULL AS sout_serial_str, NULL AS sout_serial_ket, NULL AS sout_seri_join";

$join_serial_in  = "";
$join_serial_out = "";

if ($serial_in_sub !== '') {
    $select_serial_in = "sin.serial_awal AS sin_serial_awal, sin.serial_akhir AS sin_serial_akhir, sin.serial_str AS sin_serial_str, sin.serial_ket AS sin_serial_ket, sin.seri_join AS sin_seri_join";
    $join_serial_in = "LEFT JOIN ( ".$serial_in_sub." ) sin
        ON (m.ref_doc IS NOT NULL AND m.ref_doc <> '' AND sin.ref_doc = m.ref_doc AND sin.id_barang = m.id_barang)";
}
if ($serial_out_sub !== '') {
    $select_serial_out = "sout.serial_awal AS sout_serial_awal, sout.serial_akhir AS sout_serial_akhir, sout.serial_str AS sout_serial_str, sout.serial_ket AS sout_serial_ket, sout.seri_join AS sout_seri_join";
    $join_serial_out = "LEFT JOIN ( ".$serial_out_sub." ) sout
        ON (m.ref_doc IS NOT NULL AND m.ref_doc <> '' AND sout.ref_doc = m.ref_doc AND sout.id_barang = m.id_barang)";
}

/* ======================================================
 * BUILD WHERE tb_mutasi
 * ====================================================== */
$where = " WHERE 1=1 ";

if ($id_barang>0) { $where .= " AND m.id_barang=".$id_barang." "; }

/* Filter lokasi */
if ($id_cabang > 0) {

    if ($kankas_mode === 'KANKAS_ONLY' && $id_kankas_int && $id_kankas_int > 0) {

        $where .= " AND (";

        // 1) Mutasi memang tercatat atas kankas tsb (PK atau SIMPEG)
        $where .= " (m.id_kankas = ".(int)$id_kankas_int;
        if ($kankas_alt_simpeg > 0) {
            $where .= " OR m.id_kankas = ".(int)$kankas_alt_simpeg;
        }
        $where .= ") ";

        // 2) Fallback IN ke kankas via tk.ref_doc (WAJIB ref_doc tidak kosong)
        if ($has_keluar_id_kankas_tuju) {
            $where .= " OR (
              UPPER(m.jenis_mutasi) = 'IN'
              AND m.ref_doc IS NOT NULL AND m.ref_doc <> ''
              AND tk.id_kankas_tuju = ".(int)$id_kankas_int."
              AND UPPER(tk.mode_keluar) = 'TRANSFER_KK'
            ) ";
        }

        // 3) Fallback OUT dari kankas via tk.ref_doc (WAJIB ref_doc tidak kosong)
        if ($has_keluar_id_kankas_asal) {
            $where .= " OR (
              UPPER(m.jenis_mutasi) = 'OUT'
              AND m.ref_doc IS NOT NULL AND m.ref_doc <> ''
              AND tk.id_kankas_asal = ".(int)$id_kankas_int."
              AND UPPER(tk.mode_keluar) = 'TRANSFER_KK'
            ) ";
        }

        $where .= " ) ";

    } elseif ($kankas_mode === 'CABANG_ONLY') {

        $where .= " AND m.id_cabang = ".(int)$id_cabang." ";
        $where .= " AND (m.id_kankas = 0 OR m.id_kankas IS NULL) ";

    } else {

        // ALL: stok cabang + semua kankas dalam cabang tsb
        $where .= " AND (
            (m.id_cabang = ".(int)$id_cabang." AND (m.id_kankas = 0 OR m.id_kankas IS NULL))
            OR
            EXISTS (
              SELECT 1 FROM tb_kankas kk2
              WHERE kk2.aktif=1
                AND kk2.id_cabang = ".(int)$id_cabang."
                AND (kk2.id_kankas = m.id_kankas OR kk2.kode_kankas_simpeg = m.id_kankas)
            )
        ) ";

    }

} else {

    // cabang belum dipilih: hanya izinkan jika memang KANKAS_ONLY
    if ($kankas_mode === 'KANKAS_ONLY' && $id_kankas_int && $id_kankas_int > 0) {

        $where .= " AND (";

        $where .= " (m.id_kankas = ".(int)$id_kankas_int;
        if ($kankas_alt_simpeg > 0) $where .= " OR m.id_kankas = ".(int)$kankas_alt_simpeg;
        $where .= ") ";

        if ($has_keluar_id_kankas_tuju) {
            $where .= " OR (
              UPPER(m.jenis_mutasi)='IN'
              AND m.ref_doc IS NOT NULL AND m.ref_doc <> ''
              AND tk.id_kankas_tuju = ".(int)$id_kankas_int."
              AND UPPER(tk.mode_keluar) = 'TRANSFER_KK'
            ) ";
        }
        if ($has_keluar_id_kankas_asal) {
            $where .= " OR (
              UPPER(m.jenis_mutasi)='OUT'
              AND m.ref_doc IS NOT NULL AND m.ref_doc <> ''
              AND tk.id_kankas_asal = ".(int)$id_kankas_int."
              AND UPPER(tk.mode_keluar) = 'TRANSFER_KK'
            ) ";
        }

        $where .= " ) ";
    }
}

/* Filter tanggal */
if ($from!='' && $to!='') {
    $from_sql = mysqli_real_escape_string($koneksi,$from);
    $to_sql   = mysqli_real_escape_string($koneksi,$to);
    $where   .= " AND m.tgl_mutasi BETWEEN '".$from_sql." 00:00:00' AND '".$to_sql." 23:59:59' ";
} elseif ($from!='') {
    $from_sql = mysqli_real_escape_string($koneksi,$from);
    $where   .= " AND m.tgl_mutasi >= '".$from_sql." 00:00:00' ";
} elseif ($to!='') {
    $to_sql = mysqli_real_escape_string($koneksi,$to);
    $where .= " AND m.tgl_mutasi <= '".$to_sql." 23:59:59' ";
}

/* ======================================================
 * QUERY MUTASI
 * ====================================================== */
$mutasi = array();
if ($id_barang>0 && ($id_cabang>0 || ($kankas_mode==='KANKAS_ONLY' && $id_kankas_int>0))) {

    $sqlMut = "
        SELECT
          m.*,
          b.kode_barang, b.nama_barang, b.satuan, b.is_serialized,
          c.kode_cabang, c.nama_cabang,
          kk.kode_kankas_simpeg, kk.nama_kankas,

          tk.mode_keluar,
          tk.id_cabang_asal,
          tk.id_cabang_tuju,
          tk.id_kankas_tuju,
          tk.id_kankas_asal,
          tk.id_penerima_tuju,
          tk.penerima_nama,

          ".$select_serial_in.",
          ".$select_serial_out."

        FROM tb_mutasi m
        JOIN tb_barang b ON b.id_barang = m.id_barang
        LEFT JOIN tb_cabang c ON c.id_cabang = m.id_cabang

        LEFT JOIN tb_kankas kk
          ON (kk.id_kankas = m.id_kankas OR kk.kode_kankas_simpeg = m.id_kankas)

        LEFT JOIN ( ".$tk_subquery." ) tk
          ON (m.ref_doc IS NOT NULL AND m.ref_doc <> '' AND tk.ref_doc = m.ref_doc)

        ".$join_serial_in."
        ".$join_serial_out."

        ".$where."
        ORDER BY m.tgl_mutasi ASC, m.id_mutasi ASC
        LIMIT 2000
    ";

    $qMut = mysqli_query($koneksi, $sqlMut);
    while($qMut && ($rM=mysqli_fetch_assoc($qMut))){
        $mutasi[]=$rM;
    }
}

/* Split mutasi ke IN dan OUT */
$mutasi_in  = array();
$mutasi_out = array();
foreach ($mutasi as $m) {
    $jm = strtoupper(safe_trim($m['jenis_mutasi'] ?? ''));
    if ($jm === 'OUT') $mutasi_out[] = $m;
    else $mutasi_in[] = $m;
}

/* Hitung total IN, total OUT, saldo manual */
$total_in  = 0;
foreach($mutasi_in as $mi) $total_in += intval($mi['qty'] ?? 0);
$total_out = 0;
foreach($mutasi_out as $mo) $total_out += intval($mo['qty'] ?? 0);
$saldo_akhir_manual = $total_in - $total_out;

/* helper */
function fmt_dt($dt){
    $dt = safe_str($dt);
    if ($dt==='' || $dt==='0000-00-00 00:00:00') return '-';
    return date('d/m/Y H:i', strtotime($dt));
}

/* ======================================================
 * SERIAL PARSER + ALLOCATOR (per ref_doc + id_barang + jenis)
 * ====================================================== */
if (!function_exists('parse_serial_segments_local')) {
  function parse_serial_segments_local($text){
    $text = trim((string)($text ?? ''));
    if ($text === '') return array();

    $segs = array();

    // ambil SEMUA range yg muncul
    if (preg_match_all('/(\d+)\s*(?:s\s*\/\s*d|s\.?\s*d|sd|to|hingga|sampai|[-–—])\s*(\d+)/i', $text, $mm, PREG_SET_ORDER)) {
      foreach($mm as $m){
        $a = (int)$m[1]; $b = (int)$m[2];
        if ($a <= 0 || $b <= 0) continue;
        if ($b < $a) { $t=$a; $a=$b; $b=$t; }
        $key = $a.'|'.$b;
        $segs[$key] = array($a,$b);
      }
    } else {
      // kalau tidak ada pola range, coba ambil angka tunggal (misal serial satuan)
      if (preg_match_all('/\b(\d+)\b/', $text, $mm2)) {
        foreach($mm2[1] as $n){
          $a = (int)$n;
          if ($a <= 0) continue;
          $key = $a.'|'.$a;
          $segs[$key] = array($a,$a);
        }
      }
    }

    $list = array_values($segs);

    // urutkan berdasarkan awal
    usort($list, function($x,$y){
      if ($x[0] == $y[0]) return $x[1] <=> $y[1];
      return $x[0] <=> $y[0];
    });

    return $list;
  }
}

if (!function_exists('alloc_serial_segments_local')) {
  function alloc_serial_segments_local($key, $segments, $qty, &$ptrCache){
    $qty = (int)$qty;
    if ($qty <= 0 || !is_array($segments) || count($segments) === 0) return '-';

    if (!isset($ptrCache[$key])) {
      $ptrCache[$key] = array('idx'=>0, 'pos'=>(int)$segments[0][0]);
    }

    $idx = (int)$ptrCache[$key]['idx'];
    $pos = (int)$ptrCache[$key]['pos'];

    $outParts = array();

    while ($qty > 0 && $idx < count($segments)) {
      $segStart = (int)$segments[$idx][0];
      $segEnd   = (int)$segments[$idx][1];

      if ($pos < $segStart) $pos = $segStart; // loncat gap
      if ($pos > $segEnd) { // segmen habis
        $idx++;
        if ($idx < count($segments)) $pos = (int)$segments[$idx][0];
        continue;
      }

      $avail = $segEnd - $pos + 1;
      $take  = ($qty < $avail) ? $qty : $avail;

      $a = $pos;
      $b = $pos + $take - 1;

      $outParts[] = ($a === $b) ? (string)$a : ($a.' s/d '.$b);

      $pos = $b + 1;
      $qty -= $take;

      if ($pos > $segEnd) {
        $idx++;
        if ($idx < count($segments)) $pos = (int)$segments[$idx][0];
      }
    }

    $ptrCache[$key]['idx'] = $idx;
    $ptrCache[$key]['pos'] = $pos;

    if (count($outParts) === 0) return '-';
    return implode('; ', $outParts);
  }
}

/* ===== FIX FINAL: serial tampil (join -> alokasi per baris) ===== */
function get_serial_and_ket($row){
    // keterangan dari mutasi (perbanyak alias kolom)
    $ket = safe_str(
        $row['keterangan'] ??
        ($row['keterangan_mutasi'] ?? ($row['ket_mutasi'] ?? ($row['ket'] ?? ($row['note'] ?? ($row['catatan'] ?? '')))))
    );

    $jm  = strtoupper(safe_trim($row['jenis_mutasi'] ?? ''));
    $ref = safe_trim($row['ref_doc'] ?? '');
    $idb = (int)($row['id_barang'] ?? 0);
    $qty = (int)($row['qty'] ?? 0);

    // kalau barang tidak serialized, jangan parse angka dari ket (hindari false-positive)
    $isSer = (int)($row['is_serialized'] ?? 0);
    if ($isSer !== 1) {
        return array('-', $ket);
    }

    // ambil pool serial (prioritas join seri_join)
    $pool = '';
    if ($jm === 'IN') {
        $pool = safe_str($row['sin_seri_join'] ?? '');
        if ($pool === '') {
            $a = safe_str($row['sin_serial_awal'] ?? '');
            $b = safe_str($row['sin_serial_akhir'] ?? '');
            $sv= safe_str($row['sin_serial_str'] ?? '');
            if ($a !== '' && $b !== '' && $a !== '0' && $b !== '0') $pool = $a.' s/d '.$b;
            else if ($sv !== '' && $sv !== '0') $pool = $sv;
        }
    } else if ($jm === 'OUT') {
        $pool = safe_str($row['sout_seri_join'] ?? '');
        if ($pool === '') {
            $a = safe_str($row['sout_serial_awal'] ?? '');
            $b = safe_str($row['sout_serial_akhir'] ?? '');
            $sv= safe_str($row['sout_serial_str'] ?? '');
            if ($a !== '' && $b !== '' && $a !== '0' && $b !== '0') $pool = $a.' s/d '.$b;
            else if ($sv !== '' && $sv !== '0') $pool = $sv;
        }
    }

    static $segCache = array(); // key => segments
    static $ptrCache = array(); // key => pointer state

    // alokasi hanya jika ref_doc ada (biar grouping aman)
    if ($ref !== '' && $idb > 0 && $qty > 0) {
        $key = $jm.'|'.$ref.'|'.$idb;

        if (!isset($segCache[$key])) {
            $segCache[$key] = parse_serial_segments_local($pool);
        }

        $segments = $segCache[$key];
        if (is_array($segments) && count($segments) > 0) {
            $serialAllocated = alloc_serial_segments_local($key, $segments, $qty, $ptrCache);
            if ($serialAllocated !== '-' && $serialAllocated !== '') {
                return array($serialAllocated, $ket);
            }
        }
    }

    // fallback: tampilkan pool apa adanya
    if (trim($pool) !== '') {
        // normalisasi 1 range jika cocok
        if (preg_match('/(\d+)\s*(?:s\s*\/\s*d|s\.?\s*d|sd|to|hingga|sampai|[-–—])\s*(\d+)/i', $pool, $m)) {
            return array($m[1].' s/d '.$m[2], $ket);
        }
        return array(trim($pool), $ket);
    }

    // fallback terakhir: parse dari keterangan
    if ($ket !== '' && preg_match('/(\d+)\s*(?:s\s*\/\s*d|s\.?\s*d|sd|to|hingga|sampai|[-–—])\s*(\d+)/i', $ket, $m)) {
        return array($m[1].' s/d '.$m[2], $ket);
    }

    return array('-', $ket);
}

function get_penerima_by_mode($row){
    global $koneksi;

    $mode = strtoupper(safe_trim($row['mode_keluar'] ?? ''));
    static $cacheCab = array();
    static $cacheKk  = array();
    static $cacheUsr = array();

    if ($mode === 'TRANSFER' && !empty($row['id_cabang_tuju'])) {
        $id = (int)$row['id_cabang_tuju'];
        if (!isset($cacheCab[$id])) {
            $q = mysqli_query($koneksi,"SELECT kode_cabang,nama_cabang FROM tb_cabang WHERE id_cabang=".$id." LIMIT 1");
            $cacheCab[$id] = ($q && ($r=mysqli_fetch_assoc($q))) ? ($r['kode_cabang'].' - '.$r['nama_cabang']) : '';
        }
        return $cacheCab[$id];
    }

    if ($mode === 'TRANSFER_KK' && !empty($row['id_kankas_tuju'])) {
        $id = (int)$row['id_kankas_tuju'];
        if (!isset($cacheKk[$id])) {
            $q = mysqli_query($koneksi,"SELECT kode_kankas_simpeg,nama_kankas FROM tb_kankas WHERE id_kankas=".$id." LIMIT 1");
            $cacheKk[$id] = ($q && ($r=mysqli_fetch_assoc($q))) ? (safe_str($r['kode_kankas_simpeg']).' - '.safe_str($r['nama_kankas'])) : '';
        }
        return $cacheKk[$id];
    }

    if ($mode === 'PAKAI' && !empty($row['id_penerima_tuju'])) {
        $id = (int)$row['id_penerima_tuju'];
        if (!isset($cacheUsr[$id])) {
            $q = mysqli_query($koneksi,"SELECT nama_lengkap FROM tb_user WHERE id_user=".$id." LIMIT 1");
            $cacheUsr[$id] = ($q && ($r=mysqli_fetch_assoc($q))) ? safe_str($r['nama_lengkap']) : '';
        }
        return $cacheUsr[$id];
    }

    if (safe_str($row['penerima_nama'] ?? '') !== '') return safe_str($row['penerima_nama']);
    return '';
}

function get_pengirim_dan_penerima($row){
    $penerima = get_penerima_by_mode($row);
    return ($penerima !== '' ? $penerima : '-');
}

/* Label lokasi yang sedang dipilih */
$lokasi_label = '-';
if ($id_cabang > 0) {
    $cabLbl = '';
    $qCabLbl = mysqli_query($koneksi,"SELECT kode_cabang,nama_cabang FROM tb_cabang WHERE id_cabang=".intval($id_cabang)." LIMIT 1");
    if ($qCabLbl && ($r=mysqli_fetch_assoc($qCabLbl))) $cabLbl = safe_str($r['kode_cabang']).' - '.safe_str($r['nama_cabang']);

    if ($kankas_mode === 'KANKAS_ONLY' && $id_kankas_int>0) {
        $qKkLbl = mysqli_query($koneksi,"SELECT kode_kankas_simpeg,nama_kankas FROM tb_kankas WHERE id_kankas=".intval($id_kankas_int)." LIMIT 1");
        if ($qKkLbl && ($rk=mysqli_fetch_assoc($qKkLbl))) {
            $lokasi_label = safe_str($rk['kode_kankas_simpeg']).' - '.safe_str($rk['nama_kankas']);
        } else {
            $lokasi_label = 'Kankas (id_kankas='.intval($id_kankas_int).')';
        }
    } elseif ($kankas_mode === 'CABANG_ONLY') {
        $lokasi_label = ($cabLbl !== '' ? $cabLbl : 'Cabang');
    } else {
        $lokasi_label = ($cabLbl !== '' ? $cabLbl : 'Cabang').' + (Semua Kankas)';
    }
}
?>
<div class="container-fluid kartu-stok-page">
  <div class="row mb-3 kartu-stock-head">
    <div class="col-md-8 kartu-stock-head-main">
      <span class="kartu-stock-head-icon" aria-hidden="true"><i class="bi bi-journal-text"></i></span>
      <div class="kartu-stock-head-copy">
      <h4>Kartu Stok per Item</h4>
      <div class="text-muted" style="font-size:11px;">
        Lokasi: <strong><?php echo h($lokasi_label); ?></strong>
      </div>
      </div>
    </div>
  </div>

  <!-- Filter -->
  <div class="card filter-card" style="margin-bottom:16px;border-radius:12px;border:1px solid #e5e7eb;">
    <div class="card-body" style="font-size:12px;">
      <form class="form-inline" method="get" action="index.php" style="font-size:12px;" id="frmFilterKartu">
        <input type="hidden" name="page" value="stok/kartu-stok">

        <div class="form-group filter-location" style="margin-right:10px;margin-bottom:8px;">
          <label style="font-size:11px;font-weight:600;display:block;">Cabang</label>
          <select name="id_cabang" id="filter_cabang" class="form-control"
                  style="border-radius:8px;font-size:12px;"
                  <?php echo ($is_cabang_like || $is_kankas_like) ? 'disabled' : ''; ?>>
            <option value="">-- Pilih Cabang --</option>
            <?php foreach($cabang_list as $c){ ?>
              <option value="<?php echo (int)$c['id_cabang']; ?>" <?php echo ($id_cabang==(int)$c['id_cabang']?'selected':''); ?>>
                <?php echo h(safe_str($c['kode_cabang']).' - '.safe_str($c['nama_cabang'])); ?>
              </option>
            <?php } ?>
          </select>
          <?php if ($is_cabang_like || $is_kankas_like) { ?>
            <input type="hidden" name="id_cabang" value="<?php echo (int)$id_cabang; ?>">
          <?php } ?>
        </div>

        <div class="form-group filter-location" style="margin-right:10px;margin-bottom:8px;">
          <label style="font-size:11px;font-weight:600;display:block;">Kankas</label>
          <select name="id_kankas" id="filter_kankas" class="form-control"
                  style="border-radius:8px;font-size:12px;"
                  <?php echo ($is_kankas_like ? 'disabled' : ''); ?>
                  <?php echo ($id_cabang<=0 ? 'disabled' : ''); ?>>
            <option value="" <?php echo ($id_kankas_raw==='' ? 'selected' : ''); ?>>
              -- Semua (Cabang + Kankas) --
            </option>
            <option value="0" <?php echo ($id_kankas_raw==='0' ? 'selected' : ''); ?>>
              -- Tanpa Kankas (Stok Cabang) --
            </option>
            <?php foreach($kankas_list as $kk){ ?>
              <?php
                $val = (string)intval($kk['id_kankas']);
                $label = trim(safe_str($kk['kode_kankas_simpeg']).' - '.safe_str($kk['nama_kankas']));
              ?>
              <option value="<?php echo h($val); ?>" <?php echo ($id_kankas_raw!=='' && $id_kankas_raw===$val ? 'selected' : ''); ?>>
                <?php echo h($label); ?>
              </option>
            <?php } ?>
          </select>
          <?php if ($is_kankas_like && $id_kankas_int>0) { ?>
            <input type="hidden" name="id_kankas" value="<?php echo (int)$id_kankas_int; ?>">
          <?php } ?>
        </div>

        <div class="form-group filter-item" style="margin-right:10px;margin-bottom:8px;">
          <label style="font-size:11px;font-weight:600;display:block;">Barang</label>
          <select name="id_barang" class="form-control" style="border-radius:8px;font-size:12px;">
            <option value="">-- Pilih Barang --</option>
            <?php foreach($barang_list as $b){ ?>
              <option value="<?php echo (int)$b['id_barang']; ?>" <?php echo ($id_barang==(int)$b['id_barang']?'selected':''); ?>>
                <?php echo h(safe_str($b['kode_barang']).' - '.safe_str($b['nama_barang']).' ('.safe_str($b['satuan']).')'); ?>
              </option>
            <?php } ?>
          </select>
        </div>

        <div class="form-group filter-date" style="margin-right:10px;margin-bottom:8px;">
          <label style="font-size:11px;font-weight:600;display:block;">Dari</label>
          <input type="date" class="form-control" name="from"
                 value="<?php echo h($from); ?>"
                 style="border-radius:8px;font-size:12px;">
        </div>

        <div class="form-group filter-date" style="margin-right:10px;margin-bottom:8px;">
          <label style="font-size:11px;font-weight:600;display:block;">Sampai</label>
          <input type="date" class="form-control" name="to"
                 value="<?php echo h($to); ?>"
                 style="border-radius:8px;font-size:12px;">
        </div>

        <div class="form-group filter-action" style="margin-bottom:8px;vertical-align:bottom;padding-top:18px;">
          <button type="submit" class="btn btn-secondary btn-sm btn-apply-filter" style="border-radius:8px;">
            Tampilkan
          </button>
        </div>
      </form>
    </div>
  </div>

  <?php if (!($id_barang>0 && ($id_cabang>0 || ($kankas_mode==='KANKAS_ONLY' && $id_kankas_int>0)))) { ?>
    <div class="card kartu-stock-empty-guide" style="border-radius:12px;border:1px solid #e5e7eb;">
      <div class="card-body" style="font-size:12px;background:#ffffff;">
        <div class="alert alert-info" style="font-size:12px;border-radius:8px;margin-bottom:0;">
          <span class="kartu-stock-empty-icon" aria-hidden="true"><i class="bi bi-funnel"></i></span>
          Silakan pilih Cabang (dan/atau Kankas) serta Barang dahulu, lalu klik Tampilkan.
        </div>
      </div>
    </div>
  <?php } else { ?>

    <div class="row">
      <!-- IN -->
      <div class="col-md-6" style="margin-bottom:16px;">
        <div class="card data-card" style="border-radius:12px;border:1px solid #e5e7eb;">
          <div class="card-body" style="font-size:12px;background:#ffffff;">
            <div class="mutation-card-head mutation-card-head-in">
            <span class="mutation-card-icon" aria-hidden="true"><i class="bi bi-box-arrow-in-down"></i></span>
            <div>
            <h5 style="font-size:13px;font-weight:600;margin-bottom:4px;">Barang Masuk (IN)</h5>
            <div class="mutation-card-summary" style="font-size:11px;margin-bottom:6px;color:#6b7280;">
              Total IN: <strong><?php echo (int)$total_in; ?></strong>
            </div>
            </div>
            </div>

            <div class="table-responsive">
              <table id="tblKartuIn" class="table table-sm table-hover table-modern" style="font-size:12px;width:100%;">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th style="text-align:right;">Qty</th>
                    <th>No. Seri</th>
                    <th style="text-align:right;">Saldo Akhir</th>
                    <th>Ref Dokumen</th>
                  </tr>
                </thead>
                <tbody>
                  <?php if (count($mutasi_in)==0) { ?>
                    <tr class="stock-empty-row"><td colspan="6" style="text-align:center;color:#6b7280;">Tidak ada mutasi IN.</td></tr>
                  <?php } else { ?>
                    <?php foreach($mutasi_in as $m){ ?>
                      <?php
                        $qtyDisp = intval($m['qty'] ?? 0);
                        list($serialText, $ketDisp) = get_serial_and_ket($m);
                        $saldoRow = safe_str($m['saldo_akhir'] ?? '');
                      ?>
                      <tr>
                        <td data-label="Tanggal"><?php echo h(fmt_dt($m['tgl_mutasi'] ?? '')); ?></td>
                        <td data-label="Jenis"><?php echo h($m['jenis_mutasi'] ?? ''); ?></td>
                        <td data-label="Jumlah" style="text-align:right;"><?php echo (int)$qtyDisp; ?></td>
                        <td data-label="Nomor Seri"><?php echo h($serialText); ?></td>
                        <td data-label="Saldo Akhir" style="text-align:right;"><?php echo h($saldoRow); ?></td>
                        <td data-label="Referensi"><?php echo h($m['ref_doc'] ?? ''); ?></td>
                      </tr>
                    <?php } ?>
                  <?php } ?>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>

      <!-- OUT -->
      <div class="col-md-6" style="margin-bottom:16px;">
        <div class="card data-card" style="border-radius:12px;border:1px solid #e5e7eb;">
          <div class="card-body" style="font-size:12px;background:#ffffff;">
            <div class="mutation-card-head mutation-card-head-out">
            <span class="mutation-card-icon" aria-hidden="true"><i class="bi bi-box-arrow-up"></i></span>
            <div>
            <h5 style="font-size:13px;font-weight:600;margin-bottom:8px;">Barang Keluar (OUT)</h5>
            <div class="mutation-card-summary" style="font-size:11px;margin-bottom:6px;color:#6b7280;">
              Total OUT: <strong><?php echo (int)$total_out; ?></strong>,
              Saldo Manual (IN - OUT): <strong><?php echo (int)$saldo_akhir_manual; ?></strong>
            </div>
            </div>
            </div>
            <div class="table-responsive">
              <table id="tblKartuOut" class="table table-sm table-hover table-modern" style="font-size:12px;width:100%;">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Penerima</th>
                    <th>No. Seri</th>
                    <th style="text-align:right;">Qty</th>
                    <th>Ref Dokumen</th>
                  </tr>
                </thead>
                <tbody>
                  <?php if (count($mutasi_out)==0) { ?>
                    <tr class="stock-empty-row"><td colspan="6" style="text-align:center;color:#6b7280;">Tidak ada mutasi OUT.</td></tr>
                  <?php } else { ?>
                    <?php foreach($mutasi_out as $m){ ?>
                      <?php
                        $qtyDisp = intval($m['qty'] ?? 0);
                        list($serialText, $ketDisp) = get_serial_and_ket($m);
                        $penerima = get_pengirim_dan_penerima($m);
                      ?>
                      <tr>
                        <td data-label="Tanggal"><?php echo h(fmt_dt($m['tgl_mutasi'] ?? '')); ?></td>
                        <td data-label="Jenis"><?php echo h($m['jenis_mutasi'] ?? ''); ?></td>
                        <td data-label="Penerima"><?php echo h($penerima); ?></td>
                        <td data-label="Nomor Seri"><?php echo h($serialText); ?></td>
                        <td data-label="Jumlah" style="text-align:right;"><?php echo (int)$qtyDisp; ?></td>
                        <td data-label="Referensi"><?php echo h($m['ref_doc'] ?? ''); ?></td>
                      </tr>
                    <?php } ?>
                  <?php } ?>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>

    <small class="text-muted kartu-stock-note" style="font-size:11px;">
      Catatan: Filter Kankas memakai <code>tb_mutasi.id_kankas</code> dan fallback <code>tb_trans_keluar.id_kankas_tuju</code> via <code>ref_doc</code>
      (join sudah dibuat 1 baris per ref_doc agar data tidak “ketarik”/duplikat).
      Serial per baris sekarang dialokasikan berdasarkan QTY agar tidak tampil sama saat 1 ref_doc punya banyak batch.
    </small>

  <?php } ?>

</div>

<style>
.table-modern {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.04);
}
.table-modern thead {
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
}
.table-modern thead th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  font-weight: 600;
  padding: 10px 12px;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}
.table-modern thead th + th { border-left: 1px solid #e5e7eb; }
.table-modern tbody tr { background-color: #ffffff; }
.table-modern tbody tr:nth-child(even) { background-color: #f9fafb; }
.table-modern tbody td {
  padding: 8px 12px;
  font-size: 12px;
  color: #111827;
  border-top: 1px solid #f1f5f9;
}
.table-modern tbody td + td { border-left: 1px solid #f1f5f9; }
.table-modern tbody tr:hover { background-color: #eef2ff; }
.table-modern th, .table-modern td { vertical-align: middle !important; }
.filter-card .card-body, .data-card .card-body { padding: 12px 14px; }
.kartu-stok-page .kartu-stock-head-icon,
.kartu-stok-page .kartu-stock-empty-icon,
.kartu-stok-page .mutation-card-icon{ display:none; }
@media (max-width: 990px) {
  .kartu-stok-page{
    width:100%;
    max-width:100%;
    min-width:0;
    padding:0 0 calc(112px + env(safe-area-inset-bottom))!important;
    overflow-x:clip;
  }
  .kartu-stok-page *{ box-sizing:border-box; }
  .kartu-stok-page .kartu-stock-head{
    position:relative;
    display:block;
    width:100%;
    margin:0 0 14px!important;
    padding:0;
    overflow:hidden;
    border:1px solid #dce6f3;
    border-radius:23px;
    background:
      radial-gradient(circle at 94% 12%,rgba(52,202,219,.15) 0 62px,transparent 63px),
      linear-gradient(135deg,#fff 0%,#f5f8ff 64%,#ecfbff 100%);
    box-shadow:0 14px 34px rgba(25,47,80,.09);
  }
  .kartu-stok-page .kartu-stock-head-main{
    display:flex;
    width:100%;
    max-width:none;
    flex:0 0 100%;
    align-items:center;
    gap:12px;
    padding:17px 16px;
  }
  .kartu-stok-page .kartu-stock-head-icon{
    display:grid;
    flex:0 0 48px;
    width:48px;
    height:48px;
    place-items:center;
    border:1px solid #d8e4ff;
    border-radius:16px;
    background:linear-gradient(145deg,#eef1ff,#eafcff);
    color:#5146e5;
    font-size:21px;
    box-shadow:0 8px 20px rgba(74,76,214,.10);
  }
  .kartu-stok-page .kartu-stock-head-copy{
    min-width:0;
    flex:1 1 auto;
  }
  .kartu-stok-page .kartu-stock-head h4{
    margin:0;
    color:#162139;
    font-size:19px!important;
    font-weight:850;
    line-height:1.25;
  }
  .kartu-stok-page .kartu-stock-head .text-muted{
    margin-top:4px;
    color:#718097!important;
    font-size:11px!important;
    line-height:1.5;
    overflow-wrap:anywhere;
  }
  .kartu-stok-page .card{
    width:100%;
    max-width:100%;
    min-width:0;
    border-color:#dfe7f1!important;
    border-radius:23px!important;
    box-shadow:0 12px 30px rgba(31,55,91,.075);
  }
  .kartu-stok-page .filter-card{
    margin-bottom:14px!important;
    overflow:hidden;
    background:linear-gradient(145deg,#fff,#f8faff);
  }
  .kartu-stok-page .filter-card .card-body{ padding:16px!important; }
  .kartu-stok-page #frmFilterKartu{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    gap:12px 10px;
    width:100%;
    align-items:end;
  }
  .kartu-stok-page #frmFilterKartu .form-group{
    width:100%;
    min-width:0;
    margin:0!important;
    padding:0!important;
  }
  .kartu-stok-page #frmFilterKartu .filter-location,
  .kartu-stok-page #frmFilterKartu .filter-item,
  .kartu-stok-page #frmFilterKartu .filter-action{
    grid-column:1/-1;
  }
  .kartu-stok-page #frmFilterKartu label{
    display:block;
    margin:0 0 7px;
    color:#536078;
    font-size:10px!important;
    font-weight:850!important;
    text-transform:uppercase;
    letter-spacing:.035em;
  }
  .kartu-stok-page #frmFilterKartu .form-control{
    width:100%;
    max-width:100%;
    height:52px;
    margin:0;
    padding:0 13px;
    border:1px solid #d8e3ef;
    border-radius:15px!important;
    background-color:#f9fbfe;
    color:#293750;
    font-size:12px!important;
    outline:none;
    box-shadow:none;
  }
  .kartu-stok-page #frmFilterKartu .form-control:focus{
    border-color:#7d87f5;
    box-shadow:0 0 0 4px rgba(87,81,228,.10);
  }
  .kartu-stok-page #frmFilterKartu .form-control:disabled{
    border-color:#d7e0ea;
    background:#edf2f7;
    color:#4f5e74;
    -webkit-text-fill-color:#4f5e74;
    opacity:1;
  }
  .kartu-stok-page #frmFilterKartu .filter-action{
    min-height:50px;
    overflow:visible;
  }
  .kartu-stok-page #frmFilterKartu .btn-apply-filter{
    width:100%;
    min-height:50px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:10px 15px;
    border:0;
    border-radius:15px!important;
    background:linear-gradient(135deg,#4937dc,#087ca8)!important;
    color:#fff!important;
    font-size:12px;
    font-weight:850;
    line-height:1.25;
    text-align:center;
    white-space:normal;
    opacity:1!important;
    visibility:visible;
    box-shadow:0 11px 23px rgba(67,83,213,.21);
  }
  .kartu-stok-page #frmFilterKartu .btn-apply-filter:hover,
  .kartu-stok-page #frmFilterKartu .btn-apply-filter:focus,
  .kartu-stok-page #frmFilterKartu .btn-apply-filter:active{
    background:linear-gradient(135deg,#3827ca,#087ead)!important;
    color:#fff!important;
    box-shadow:0 0 0 4px rgba(55,73,204,.13),0 10px 22px rgba(67,83,213,.20)!important;
  }
  .kartu-stok-page #frmFilterKartu .btn-apply-filter:disabled,
  .kartu-stok-page #frmFilterKartu .btn-apply-filter.disabled{
    border:1px solid #d6dfe9!important;
    background:#e7ecf2!important;
    color:#4e5c71!important;
    -webkit-text-fill-color:#4e5c71;
    opacity:1!important;
    box-shadow:none!important;
    cursor:not-allowed;
  }
  .kartu-stok-page .kartu-stock-empty-guide{
    overflow:hidden;
    background:linear-gradient(145deg,#fff,#f8faff);
  }
  .kartu-stok-page .kartu-stock-empty-guide .card-body{ padding:14px!important; }
  .kartu-stok-page .kartu-stock-empty-guide .alert{
    display:grid;
    min-height:158px;
    place-items:center;
    align-content:center;
    gap:11px;
    margin:0;
    padding:20px;
    border:1px dashed #d6e3f1;
    border-radius:18px!important;
    background:#f7faff;
    color:#718097;
    text-align:center;
    line-height:1.55;
  }
  .kartu-stok-page .kartu-stock-empty-icon{
    display:grid;
    width:48px;
    height:48px;
    place-items:center;
    border-radius:16px;
    background:#eaf0ff;
    color:#5b55e8;
    font-size:20px;
  }
  .kartu-stok-page > .row:not(.kartu-stock-head){
    display:block;
    width:100%;
    margin:0;
  }
  .kartu-stok-page > .row:not(.kartu-stock-head) > [class*="col-"]{
    width:100%;
    max-width:100%;
    padding:0;
    margin:0 0 14px!important;
  }
  .kartu-stok-page .data-card{ overflow:hidden; }
  .kartu-stok-page .data-card > .card-body{ padding:13px!important; }
  .kartu-stok-page .mutation-card-head{
    display:flex;
    align-items:center;
    gap:11px;
    margin:-1px -1px 13px;
    padding:3px 2px 13px;
    border-bottom:1px solid #e8edf4;
  }
  .kartu-stok-page .mutation-card-icon{
    display:grid;
    flex:0 0 43px;
    width:43px;
    height:43px;
    place-items:center;
    border-radius:14px;
    font-size:18px;
  }
  .kartu-stok-page .mutation-card-head-in .mutation-card-icon{
    background:#e7f8f2;
    color:#0b9a72;
  }
  .kartu-stok-page .mutation-card-head-out .mutation-card-icon{
    background:#fff0eb;
    color:#dc6842;
  }
  .kartu-stok-page .mutation-card-head h5{
    margin:0 0 3px!important;
    color:#17213a;
    font-size:14px!important;
    font-weight:850!important;
  }
  .kartu-stok-page .mutation-card-summary{
    margin:0!important;
    color:#718097!important;
    font-size:10px!important;
    line-height:1.45;
  }
  .kartu-stok-page .table-responsive{
    width:100%;
    max-width:100%;
    overflow:visible!important;
  }
  .kartu-stok-page .table-modern{
    display:block;
    width:100%!important;
    margin:0;
    overflow:visible;
    border:0;
    border-radius:0;
    background:transparent;
    box-shadow:none;
  }
  .kartu-stok-page .table-modern thead{ display:none; }
  .kartu-stok-page .table-modern tbody{
    display:grid;
    width:100%;
    gap:10px;
  }
  .kartu-stok-page .table-modern tbody tr{
    display:block;
    width:100%;
    min-width:0;
    padding:12px 13px;
    border:1px solid #e0e8f2;
    border-radius:17px;
    background:
      radial-gradient(circle at 100% 0,rgba(61,197,216,.07) 0 52px,transparent 53px),
      linear-gradient(145deg,#fff,#f8faff);
    box-shadow:0 7px 19px rgba(36,56,84,.055);
  }
  .kartu-stok-page .table-modern tbody td{
    display:grid;
    grid-template-columns:90px minmax(0,1fr);
    gap:9px;
    width:100%;
    min-width:0;
    padding:7px 0!important;
    border:0!important;
    background:transparent!important;
    color:#344159;
    font-size:11px!important;
    line-height:1.45;
    text-align:left!important;
    white-space:normal;
    overflow-wrap:anywhere;
  }
  .kartu-stok-page .table-modern tbody td + td{
    border-top:1px dashed #e5ebf3!important;
  }
  .kartu-stok-page .table-modern tbody td::before{
    content:attr(data-label);
    color:#7a899f;
    font-size:9px;
    font-weight:850;
    text-transform:uppercase;
    letter-spacing:.03em;
  }
  .kartu-stok-page .table-modern tbody td:first-child{
    color:#17213a;
    font-weight:800;
  }
  .kartu-stok-page .table-modern tbody tr.stock-empty-row{
    display:grid;
    min-height:140px;
    place-items:center;
    padding:18px;
    border-style:dashed;
    box-shadow:none;
  }
  .kartu-stok-page .table-modern tbody tr.stock-empty-row td{
    display:block;
    padding:0!important;
    color:#78869b!important;
    text-align:center!important;
  }
  .kartu-stok-page .table-modern tbody tr.stock-empty-row td::before{ display:none; }
  .kartu-stok-page .kartu-stock-note{
    display:block;
    margin-top:1px;
    padding:12px 13px;
    border-radius:15px;
    background:#f1f6fc;
    color:#718097!important;
    font-size:9px!important;
    line-height:1.5;
    overflow-wrap:anywhere;
  }
}
@media (max-width: 370px) {
  .kartu-stok-page #frmFilterKartu{ grid-template-columns:minmax(0,1fr); }
  .kartu-stok-page #frmFilterKartu .filter-date{ grid-column:1/-1; }
}
</style>
