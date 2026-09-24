import { api } from "@/services/api";
import type { Asset, AssetInput } from "../types";
export const asetService = {
  list: async (signal?: AbortSignal) =>
    (await api.get<{ data: Asset[] }>("/admin/assets", { signal })).data.data,
  detail: async (id: string, signal?: AbortSignal) =>
    (await api.get<Asset>(`/admin/assets/${id}`, { signal })).data,
  save: async (data: AssetInput, id?: string) =>
    (id
      ? await api.put<Asset>(`/admin/assets/${id}`, data)
      : await api.post<Asset>("/admin/assets", data)
    ).data,
  archive: async (id: number, archived: boolean) =>
    (await api.patch<Asset>(`/admin/assets/${id}/archive`, { archived })).data,
};
