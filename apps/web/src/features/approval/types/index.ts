import type { InterestStatus } from "@/features/pengajuan/types";
export type ApprovalInput = {
  status: InterestStatus;
  notes: string;
  version: number;
};
