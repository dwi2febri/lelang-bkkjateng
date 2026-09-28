const STORAGE_KEY = "bkk-interest-history-v1";
const MAX_ENTRIES = 50;

export type SubmissionReceipt = {
  id: string;
  slug: string;
  assetCode: string;
  assetTitle: string;
  sentAt: string;
};

export function readSubmissionHistory(): SubmissionReceipt[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((entry): entry is SubmissionReceipt =>
      !!entry && typeof entry === "object" &&
      typeof entry.id === "string" && entry.id.length <= 64 &&
      typeof entry.slug === "string" && /^[a-z0-9-]{1,180}$/.test(entry.slug) &&
      typeof entry.assetCode === "string" && entry.assetCode.length <= 100 &&
      typeof entry.assetTitle === "string" && entry.assetTitle.length <= 180 &&
      typeof entry.sentAt === "string" && !Number.isNaN(Date.parse(entry.sentAt))
    ).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveSubmissionReceipt(asset: { slug: string; code: string; title: string }): boolean {
  try {
    const receipt: SubmissionReceipt = {
      id: crypto.randomUUID(),
      slug: asset.slug,
      assetCode: asset.code,
      assetTitle: asset.title,
      sentAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([receipt, ...readSubmissionHistory()].slice(0, MAX_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}
