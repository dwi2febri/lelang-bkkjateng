export const env = {
  apiBaseUrl: "/api",
  websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "",
} as const;
