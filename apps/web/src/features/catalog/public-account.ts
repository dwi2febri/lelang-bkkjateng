export type PublicUser = { id: number; name: string; email: string; phone: string };
export type AccountHistory = { id: number; slug: string; assetCode: string; assetTitle: string; sentAt: string; status: "baru" | "diproses" | "selesai" | "ditolak"; statusHistory: { id: number; status: "baru" | "diproses" | "selesai" | "ditolak"; changedAt: string }[]; unreadCount: number };
export type LatestApplicant = { name: string; email: string; phone: string };
const LAST_APPLICANT = "bkk-last-applicant-v1";

export class AccountRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function accountRequest<T>(path: string, input?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/public-account/${path}`, {
      method: input ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: input ? { "Content-Type": "application/json", "x-requested-with": "BKKPublic" } : undefined,
      body: input ? JSON.stringify(input) : undefined,
    });
  } catch {
    throw new AccountRequestError("Tidak dapat terhubung ke layanan. Periksa koneksi lalu coba kembali.", 0);
  }
  if (!response.ok) {
    const error: { message?: unknown } = await response.json().catch(() => ({}));
    const message = Array.isArray(error.message)
      ? "Isian belum sesuai. Periksa kembali data pada formulir."
      : typeof error.message === "string" ? error.message : "";
    const safeMessage = /(?:Cannot\s+(?:GET|POST|PATCH|PUT|DELETE)|\/api\/|<html)/i.test(message) ? "" : message;
    throw new AccountRequestError(safeMessage || (response.status >= 500
      ? "Layanan sedang tidak tersedia. Coba kembali beberapa saat lagi."
      : "Permintaan belum berhasil. Coba kembali."), response.status);
  }
  return response.json();
}
export function saveLatestApplicant(value: LatestApplicant) {
  try { sessionStorage.setItem(LAST_APPLICANT, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
}
export function readLatestApplicant(): LatestApplicant | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(LAST_APPLICANT) || "null");
    return value && typeof value.name === "string" && typeof value.email === "string" && typeof value.phone === "string" ? value : null;
  } catch { return null; }
}
export function clearLatestApplicant() {
  try { sessionStorage.removeItem(LAST_APPLICANT); } catch { /* Storage may be disabled. */ }
}
