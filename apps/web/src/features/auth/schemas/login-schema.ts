import type { LoginInput } from "../types";
export function validateLogin(input: LoginInput) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    return "Masukkan alamat email yang valid.";
  if (!input.password || input.password.length > 128)
    return "Masukkan kata sandi Anda (maksimal 128 karakter).";
  return null;
}
