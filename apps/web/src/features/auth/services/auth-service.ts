import { api } from "@/services/api";
import type { AdminUser, LoginInput } from "../types";
export const authService = {
  login: async (data: LoginInput) =>
    (await api.post<AdminUser>("/auth/login", data)).data,
  me: async () => (await api.get<AdminUser>("/auth/me")).data,
  logout: async () => {
    await api.post("/auth/logout");
  },
};
