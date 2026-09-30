import type { Metadata } from "next";
import "./globals.css";
import { PresenceTracker } from "@/components/presence-tracker";
import { PublicFavoritesProvider } from "@/features/catalog/public-favorites-provider";
export const metadata: Metadata = {
  title: "Lelang BKK Jateng | Temukan Aset Pilihan Anda",
  description:
    "Jelajahi katalog aset lelang BKK Jateng. Properti, tanah, ruko, dan kendaraan di Jawa Tengah.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><PresenceTracker /><PublicFavoritesProvider>{children}</PublicFavoritesProvider></body>
    </html>
  );
}
