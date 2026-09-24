import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "./admin-shell";
import "@/app/admin.css";
export async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return <AdminShell user={user}>{children}</AdminShell>;
}
