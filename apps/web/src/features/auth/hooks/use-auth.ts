"use client";
import { useRouter } from "next/navigation";
import { authService } from "../services/auth-service";
import type { LoginInput } from "../types";
import { setAuth, useAuthStore } from "@/store/auth-store";
export function useAuth() {
  const user = useAuthStore();
  const router = useRouter();
  return {
    user,
    login: async (input: LoginInput) => {
      const result = await authService.login(input);
      setAuth(result);
      router.replace("/dashboard");
      router.refresh();
    },
    logout: async () => {
      await authService.logout();
      setAuth(null);
      router.replace("/login");
      router.refresh();
    },
  };
}
