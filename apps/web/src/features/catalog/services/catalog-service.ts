import type { CatalogAsset } from "../types";
export class InterestRequestError extends Error {
  constructor(readonly status: number) { super("Permintaan belum tersimpan."); }
}
export async function getInterestStatus(slug: string, signal?: AbortSignal): Promise<{ submitted: boolean }> {
  const response = await fetch(`/api/assets/${encodeURIComponent(slug)}/interest-status`, { cache: "no-store", signal });
  if (!response.ok) throw new InterestRequestError(response.status);
  return response.json();
}
export async function getCatalog(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<{ data: CatalogAsset[]; total: number }> {
  const response = await fetch("/api/assets?" + params, { signal });
  if (!response.ok) throw new Error("Katalog belum dapat dimuat.");
  return response.json();
}
export async function sendInterest(
  slug: string,
  input: {
    name: FormDataEntryValue | null;
    email: FormDataEntryValue | null;
    phone: FormDataEntryValue | null;
    message: FormDataEntryValue;
    consent: boolean;
  },
) {
  const response = await fetch(`/api/assets/${slug}/interests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-requested-with": "BKKPublic" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new InterestRequestError(response.status);
  return response.json();
}
