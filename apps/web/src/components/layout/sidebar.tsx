"use client";
import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Images,
  Tags,
  ChevronDown,
  Plus,
  ArrowUpRight,
  Building2,
  LayoutDashboard,
  Files,
  BookOpen,
  Users,
  Landmark,
  Activity,
  X,
} from "lucide-react";
const groups = [
  { id: "assets", label: "Kelola Aset", icon: Building2, links: [
    { href: "/aset", label: "Daftar Aset", icon: Building2 },
    { href: "/aset/baru", label: "Tambah Aset", icon: Plus },
  ] },
  { id: "interests", label: "Pengajuan Minat", icon: Files, links: [
    { href: "/pengajuan", label: "Daftar Pengajuan", icon: Files },
  ] },
];
function activeLink(path: string, href: string) {
  return path === href || (href !== "/aset/baru" && href !== "/pengajuan/baru" && path.startsWith(href + "/") && !path.endsWith("/baru"));
}
export function Sidebar({
  open,
  hidden,
  onClose,
}: {
  open: boolean;
  hidden: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <>
      <button
        className={"sidebar-overlay " + (open ? "show" : "")}
        onClick={onClose}
        aria-label="Tutup menu"
      />
      <aside id="admin-sidebar" inert={hidden} className={"admin-sidebar " + (open ? "show" : "")}>
        <div className="sidebar-logo-header">
        <Link href="/dashboard" className="admin-brand">
          <BrandLogo variant="original" />
        </Link>
        </div>
        <button
          className="sidebar-close"
          aria-label="Tutup navigasi"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="sidebar-label">MENU UTAMA</span>
        <div className="sidebar-links">
          <Link href="/dashboard" onClick={onClose} className={pathname === "/dashboard" ? "active" : ""} aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard size={19} />Dashboard</Link>
          {groups.map(group => {
            const active = group.links.some(link => activeLink(pathname, link.href));
            const isOpen = expanded[pathname + group.id] ?? active;
            return <div className="sidebar-group" key={group.id}>
              <button type="button" className={`sidebar-group-toggle${active ? " current" : ""}`} aria-expanded={isOpen} aria-controls={`sidebar-${group.id}`} onClick={() => setExpanded(value => ({ ...value, [pathname + group.id]: !isOpen }))}>
                <group.icon size={19} /><span>{group.label}</span><ChevronDown size={15} className={isOpen ? "expanded" : ""} />
              </button>
              <div id={`sidebar-${group.id}`} className="sidebar-submenu" hidden={!isOpen}>
                {group.links.map(link => <Link key={link.href} href={link.href} onClick={onClose} className={activeLink(pathname, link.href) ? "active" : ""} aria-current={activeLink(pathname, link.href) ? "page" : undefined}><link.icon size={16} />{link.label}</Link>)}
              </div>
            </div>;
          })}
          <Link href="/master-kategori" onClick={onClose} className={pathname.startsWith("/master-kategori") ? "active" : ""} aria-current={pathname.startsWith("/master-kategori") ? "page" : undefined}><Tags size={19} />Master Kategori</Link>
          <Link href="/master-produk-kredit" onClick={onClose} className={pathname.startsWith("/master-produk-kredit") ? "active" : ""} aria-current={pathname.startsWith("/master-produk-kredit") ? "page" : undefined}><Landmark size={19} />Master Produk Kredit</Link>
          <Link href="/kelola-banner" onClick={onClose} className={pathname === "/kelola-banner" ? "active" : ""} aria-current={pathname === "/kelola-banner" ? "page" : undefined}><Images size={19} />Pengaturan Banner</Link>
          <Link href="/kelola-panduan" onClick={onClose} className={pathname === "/kelola-panduan" ? "active" : ""} aria-current={pathname === "/kelola-panduan" ? "page" : undefined}><BookOpen size={19} />Panduan Lelang</Link>
          <Link href="/log-user" onClick={onClose} className={pathname.startsWith("/log-user") ? "active" : ""} aria-current={pathname.startsWith("/log-user") ? "page" : undefined}><Activity size={19} />Log User</Link>
          <Link href="/manajemen-user" onClick={onClose} className={pathname.startsWith("/manajemen-user") ? "active" : ""} aria-current={pathname.startsWith("/manajemen-user") ? "page" : undefined}><Users size={19} />Manajemen User</Link>
        </div>
        <div className="sidebar-bottom">
          <Link href="/" className="portal-link">
            Lihat Portal Publik <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
    </>
  );
}
