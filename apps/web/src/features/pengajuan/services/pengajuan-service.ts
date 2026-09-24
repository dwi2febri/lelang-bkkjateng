import { api } from "@/services/api";
import type { Paginated } from "@/types/global";
import type { CreateInterest, Interest } from "../types";
export const pengajuanService = {
  list: async (
    query: { q?: string; status?: string; page?: number },
    signal?: AbortSignal,
  ) =>
    (
      await api.get<Paginated<Interest>>("/admin/pengajuan", {
        params: query,
        signal,
      })
    ).data,
  detail: async (id: string, signal?: AbortSignal) =>
    (await api.get<Interest>(`/admin/pengajuan/${id}`, { signal })).data,
  create: async (input: CreateInterest) =>
    (await api.post<Interest>("/admin/pengajuan", input)).data,
};
