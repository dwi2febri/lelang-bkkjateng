export const assetColumns = [
  ['code', 'Kode aset'], ['title', 'Nama aset'], ['category', 'Kategori'],
  ['saleMethod', 'Metode penjualan'], ['creditProduct', 'Produk kredit'],
  ['province', 'Provinsi'], ['city', 'Kabupaten kota'], ['district', 'Kecamatan'],
  ['village', 'Kelurahan desa'], ['address', 'Alamat lengkap'],
  ['price', 'Harga aset'], ['oldPrice', 'Harga sebelumnya'],
  ['certificate', 'Dokumen kepemilikan'], ['description', 'Deskripsi'],
  ['featured', 'Unggulan'], ['auctionDate', 'Jadwal lelang WIB'],
  ['auctionDeposit', 'Uang jaminan'], ['auctionOrganizer', 'Penyelenggara lelang'],
  ['auctionUrl', 'URL pengumuman lelang'], ['latitude', 'Latitude'],
  ['longitude', 'Longitude'], ['googleMapsUrl', 'URL Google Maps'], ['facilities', 'Fasilitas'],
] as const;
export const maxAssets = 200;
export const maxFileBytes = 20 * 1024 * 1024;
export const photoHeaders = ['Kode aset', 'Urutan foto', 'Foto'];
export type ImportIssue = {sheet:string; row:number; field:string; message:string};
