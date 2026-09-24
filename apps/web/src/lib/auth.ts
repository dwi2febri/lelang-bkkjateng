import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "@/features/auth/types";
export async function getAdmin(): Promise<AdminUser | null> {
  const session = (await cookies()).get("bkk_admin_session")?.value;
  if (!session || !/^[a-f0-9]{64}$/.test(session)) return null;
  const response = await fetch(
    `${process.env.API_URL || "http://127.0.0.1:3001"}/api/auth/me`,
    { headers: { Cookie: `bkk_admin_session=${session}` }, cache: "no-store" },
  );
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Layanan autentikasi tidak tersedia.");
  return response.json();
}
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect("/login");
  return user;
}
