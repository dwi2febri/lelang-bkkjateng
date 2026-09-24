"use client";
import { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { useMobile } from "@/hooks/use-mobile";
import { setAuth } from "@/store/auth-store";
import {
  dismissNotice,
  useNotificationStore,
} from "@/store/notification-store";
import type { AdminUser } from "@/features/auth/types";
export function AdminShell({
  user,
  children,
}: {
  user: AdminUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mobile = useMobile();
  const sidebarVisible = mobile ? open : !collapsed;
  useEffect(() => {
    if (!mobile || !open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById("admin-sidebar-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobile, open]);
  const notice = useNotificationStore();
  useEffect(() => setAuth(user), [user]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <div className={`admin-app${collapsed ? " sidebar-collapsed" : ""}`}>
      <Sidebar open={open} hidden={!sidebarVisible} onClose={() => setOpen(false)} />
      <div className="admin-main">
        <Navbar user={user} sidebarVisible={sidebarVisible} onMenu={() => mobile ? setOpen(value => !value) : setCollapsed(value => !value)} />
        <main className="admin-content">{children}</main>
        <Footer />
      </div>
      {notice && (
        <div className="admin-toast" role="status">
          <CheckCircle2 size={18} />
          <span>{notice.text}</span>
          <button aria-label="Tutup notifikasi" onClick={dismissNotice}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
