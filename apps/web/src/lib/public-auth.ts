import "server-only";
import { cookies } from "next/headers";
import type { PublicUser } from "@/features/catalog/public-account";

// undefined means the service is unavailable, not that the visitor is signed out.
export async function getPublicUser(): Promise<PublicUser | null | undefined> {
  const session = (await cookies()).get("bkk_public_session")?.value;
  if (!session || !/^[a-f0-9]{64}$/.test(session)) return null;

  try {
    const response = await fetch(
      `${process.env.API_URL || "http://127.0.0.1:3001"}/api/public-account/me`,
      {
        headers: { Cookie: `bkk_public_session=${session}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      },
    );
    if (response.status === 401) return null;
    if (!response.ok) return undefined;
    const user: PublicUser = await response.json();
    return { id: user.id, name: user.name, email: user.email, phone: user.phone };
  } catch {
    // The client will retry; a temporary API failure must not break the page.
    return undefined;
  }
}
