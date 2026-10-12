import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { NavigationScroll } from "@/components/navigation-scroll";
import { PresenceTracker } from "@/components/presence-tracker";
import { PublicFavoritesProvider } from "@/features/catalog/public-favorites-provider";
import { getPublicUser } from "@/lib/public-auth";
export const metadata: Metadata = {
  title: "Lelang BKK Jateng | Temukan Aset Pilihan Anda",
  icons: {
    icon: { url: "/icon-bkk.webp?v=2", type: "image/webp", sizes: "192x192" },
  },
  description:
    "Jelajahi katalog aset lelang BKK Jateng. Properti, tanah, ruko, dan kendaraan di Jawa Tengah.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialUser = await getPublicUser();
  return (
    <html lang="id">
      <body>
        <Suspense fallback={null}><NavigationScroll /></Suspense>
        <PresenceTracker />
        <PublicFavoritesProvider initialUser={initialUser}>{children}</PublicFavoritesProvider>
      </body>
    </html>
  );
}
