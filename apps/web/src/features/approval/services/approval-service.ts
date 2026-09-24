import { api } from "@/services/api";
import type { Interest } from "@/features/pengajuan/types";
import type { ApprovalInput } from "../types";
export const saveApproval = async (id: number, input: ApprovalInput) =>
  (await api.patch<Interest>(`/admin/pengajuan/${id}/status`, input)).data;
