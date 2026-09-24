"use client";
import { useSyncExternalStore } from "react";
import type { AdminUser } from "@/features/auth/types";
let current: AdminUser | null = null;
const listeners = new Set<() => void>();
export function setAuth(user: AdminUser | null) {
  current = user;
  listeners.forEach((listener) => listener());
}
export function useAuthStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => current,
    () => null,
  );
}
