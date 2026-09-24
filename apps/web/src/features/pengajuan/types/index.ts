export type InterestStatus = "baru" | "diproses" | "selesai" | "ditolak";
export type Interest = {
  id: number;
  asset_id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InterestStatus;
  admin_notes: string | null;
  version: number;
  source: "public" | "admin";
  consent: number;
  created_at: string;
  asset_title: string;
  asset_code: string;
  city?: string;
  price?: number;
  history?: {
    id: number;
    status: InterestStatus;
    notes: string;
    admin_name: string;
    created_at: string;
  }[];
};
export type CreateInterest = {
  assetId: number;
  name: string;
  email: string;
  phone: string;
  message: string;
};
