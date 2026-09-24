import axios from "axios";
export { http as api } from "@/lib/axios";
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(" · ");
    if (typeof message === "string") return message;
    if (!error.response) return "Layanan belum dapat dihubungi. Coba kembali.";
  }
  return "Terjadi kesalahan. Silakan coba kembali.";
}
