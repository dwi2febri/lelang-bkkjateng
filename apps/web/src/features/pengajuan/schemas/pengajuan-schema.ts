import type { CreateInterest } from "../types";
export function validatePengajuan(input: CreateInterest) {
  if (!input.assetId) return "Pilih aset terlebih dahulu.";
  if (input.name.trim().length < 2) return "Nama minimal dua karakter.";
  if (!/^(?:\+62|0)[0-9]{8,13}$/.test(input.phone))
    return "Nomor telepon harus diawali 0 atau +62 dan hanya berisi angka.";
  return null;
}
