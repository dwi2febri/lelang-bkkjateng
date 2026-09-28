import { api } from "@/services/api";
import type { Asset, AssetInput } from "../types";
export const asetService = {
  generateCode: async () =>
    (await api.post<{ code: string }>("/admin/assets/generate-code", {})).data.code,
  list: async (signal?: AbortSignal) =>
    (await api.get<{ data: Asset[] }>("/admin/assets", { signal })).data.data,
  detail: async (id: string, signal?: AbortSignal) =>
    (await api.get<Asset>(`/admin/assets/${id}`, { signal })).data,
  save: async (data: AssetInput, id?: string) =>
    (id
      ? await api.put<Asset>(`/admin/assets/${id}`, data)
      : await api.post<Asset>("/admin/assets", data)
    ).data,
  uploadPhotos: async (files: File[]) => {
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    return (await api.post<{ urls: string[] }>("/admin/uploads/assets", body, { timeout: 60000 })).data.urls;
  },
  archive: async (id: number, archived: boolean) =>
    (await api.patch<Asset>(`/admin/assets/${id}/archive`, { archived })).data,
};
