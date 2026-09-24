"use client";
import { useSyncExternalStore } from "react";
type Notice = { id: number; text: string };
let value: Notice | null = null;
const listeners = new Set<() => void>();
export function notify(text: string) {
  value = { id: Date.now(), text };
  listeners.forEach((fn) => fn());
}
export function dismissNotice() {
  value = null;
  listeners.forEach((fn) => fn());
}
export function useNotificationStore() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => value,
    () => null,
  );
}
