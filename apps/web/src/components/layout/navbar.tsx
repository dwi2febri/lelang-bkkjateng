"use client";
import { PanelLeftClose, PanelLeftOpen, LogOut, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import type { AdminUser } from "@/features/auth/types";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { errorMessage } from "@/services/api";
import { notify } from "@/store/notification-store";
export function Navbar({
  user,
  onMenu,
  sidebarVisible,
}: {
  user: AdminUser;
  onMenu: () => void;
  sidebarVisible: boolean;
}) {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const { logout } = useAuth();
  const title = path.startsWith("/master-kategori") ? "Master Kategori" : path.startsWith("/kelola-banner") ? "Pengaturan Banner" : path.startsWith("/kelola-panduan")
    ? "Panduan Lelang"
    : path.startsWith("/aset")
      ? "Kelola Aset"
      : path.startsWith("/pengajuan")
        ? "Pengajuan Minat"
        : path.startsWith("/approval")
          ? "Tindak Lanjut"
          : "Dashboard";
  return (
    <div className="admin-navbar">
      <button
        className="admin-menu-button"
        id="admin-sidebar-toggle"
        aria-label={sidebarVisible ? "Tutup sidebar" : "Buka sidebar"}
        aria-expanded={sidebarVisible}
        aria-controls="admin-sidebar"
        onClick={onMenu}
      >
        {sidebarVisible ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
      </button>
      <div className="admin-breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={13} />
        <strong>{title}</strong>
      </div>
      <div className="admin-user">
        <span className="avatar">{user.name.slice(0, 1)}</span>
        <span>
          <strong>{user.name}</strong>
          <small>Administrator</small>
        </span>
      </div>
      <button
        disabled={busy}
        className="logout-button"
        title="Keluar"
        aria-label="Keluar dari admin"
        onClick={async () => {
          setBusy(true);
          try {
            await logout();
          } catch (e) {
            notify(errorMessage(e));
            setBusy(false);
          }
        }}
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
