import { env } from "@/config/env";
/** Connector opsional. Backend saat ini menggunakan REST; tidak membuka koneksi tanpa URL. */
export function connectWebsocket() {
  if (!env.websocketUrl) return null;
  return new WebSocket(env.websocketUrl);
}
