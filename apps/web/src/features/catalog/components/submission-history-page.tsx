"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ClipboardList, Clock3, LogIn, MessageCircle, ShieldCheck } from "lucide-react";
import { InterestChat } from "@/components/ui/interest-chat";
import { ListSkeleton } from "@/components/ui/public-skeleton";
import { readSubmissionHistory, type SubmissionReceipt } from "../submission-history";
import { accountRequest, type AccountHistory, type PublicUser } from "../public-account";

type HistoryEntry = SubmissionReceipt & { status?: AccountHistory["status"]; statusHistory?: AccountHistory["statusHistory"]; unreadCount?: number };
const statusLabel: Record<AccountHistory["status"], string> = { baru: "Baru", diproses: "Diproses", selesai: "Selesai", ditolak: "Ditolak" };
const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "Asia/Jakarta", timeZoneName: "short",
});

export function SubmissionHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [openChats, setOpenChats] = useState<number[]>([]);
  const [openStatuses, setOpenStatuses] = useState<number[]>([]);
  useEffect(() => {
    let active = true;
    setEntries(readSubmissionHistory());
    async function load() {
      try {
        const found = await accountRequest<PublicUser>("me");
        if (!active) return;
        setUser(found);
        const history = await accountRequest<AccountHistory[]>("history");
        if (active) setEntries(history.map(entry => ({ ...entry, id: String(entry.id) })));
      } catch { /* A browser-only receipt remains visible when no account is active. */ }
      finally { if (active) setAccountChecked(true); }
    }
    void load();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function refresh() {
      if (document.hidden) return;
      try {
        const history = await accountRequest<AccountHistory[]>("history");
        if (active) setEntries(history.map(entry => ({ ...entry, id: String(entry.id) })));
      } catch { /* Keep the last known history while temporarily offline. */ }
    }
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [user]);
  return <div className="container submission-history-page">
    <div className="public-breadcrumb"><Link href="/">Beranda</Link><span>/</span><span>History Pengajuan</span></div>
    <div className="submission-history-heading">
      <div><span className="overline">{user ? "RIWAYAT AKUN ANDA" : "RIWAYAT PENGAJUAN"}</span><h1>History Pengajuan</h1><p>Catatan aset yang pernah Anda hubungi melalui formulir minat.</p></div>
      <div className="submission-history-actions">{accountChecked && !user && <Link href="/daftar" className="primary-button"><LogIn size={17}/> Daftar akun</Link>}<span className="submission-history-count"><ClipboardList size={18}/>{entries?.length ?? "—"} pengajuan</span></div>
    </div>
    <div className="submission-history-note"><ShieldCheck size={19}/><p>{user ? `Masuk sebagai ${user.email}. Status dan riwayat pengajuan diperbarui otomatis. Chat tersedia ketika pengajuan diproses.` : "Tanpa akun, riwayat hanya tersimpan di browser ini. Pengajuan lama dapat ditemukan setelah Anda memverifikasi email saat mendaftar. Kontak pengajuan terakhir disimpan sementara di tab ini untuk mengisi formulir pendaftaran; pesan tidak disimpan di browser."}</p></div>
    {!accountChecked || entries === null ? <ListSkeleton kind="history" count={2}/> : entries.length === 0 ?
      <div className="submission-history-empty"><ClipboardList size={36}/><h2>Belum ada pengajuan</h2><p>Setelah Anda mengirim formulir pada detail aset, catatannya akan muncul di sini.</p><Link href="/katalog-aset" className="primary-button">Jelajahi aset <ArrowRight size={17}/></Link></div> :
      <div className="submission-history-list">{entries.map(entry => <article className="submission-history-card" key={entry.id}>
        <div className="submission-history-card-top">
          <span className="submission-history-icon"><ClipboardList size={22}/></span>
          <div className="submission-history-info"><small>{entry.assetCode}</small><h2>{entry.assetTitle}</h2><span><Clock3 size={15}/>{dateTime.format(new Date(entry.sentAt))}</span></div>
          <div className="submission-history-tools"><span className={`submission-history-sent ${entry.status ? `submission-history-status-${entry.status}` : ""}`}>{entry.status ? statusLabel[entry.status] : "Terkirim"}</span><Link href={`/katalog-aset/${encodeURIComponent(entry.slug)}`} className="submission-history-link">Lihat aset <ArrowRight size={16}/></Link></div>
        </div>
        {user && <div className="submission-history-card-actions"><button type="button" className="submission-history-toggle" aria-expanded={openStatuses.includes(Number(entry.id))} aria-controls={`status-history-${entry.id}`} onClick={() => setOpenStatuses(current => current.includes(Number(entry.id)) ? current.filter(id => id !== Number(entry.id)) : [...current, Number(entry.id)])}>Riwayat status <ChevronDown size={16}/></button>
          {(entry.status === "diproses" || entry.statusHistory?.some(change => change.status === "diproses")) && <button type="button" className="submission-history-toggle submission-history-chat-toggle" aria-expanded={openChats.includes(Number(entry.id))} aria-controls={`interest-chat-${entry.id}`} onClick={() => setOpenChats(current => current.includes(Number(entry.id)) ? current.filter(id => id !== Number(entry.id)) : [...current, Number(entry.id)])}><MessageCircle size={17}/>{openChats.includes(Number(entry.id)) ? "Tutup chat" : entry.status === "diproses" ? "Chat pengelola aset" : "Riwayat chat"}{!!entry.unreadCount && <span className="submission-history-unread" aria-label={`${entry.unreadCount} pesan belum dibaca`}/>}</button>}
          {entry.status === "baru" && <p className="submission-history-chat-hint">Chat dengan pengelola aset baru dapat diakses setelah pengajuan berstatus <strong>Diproses</strong>.</p>}
        </div>}
        {user && openStatuses.includes(Number(entry.id)) && <div className="submission-history-progress" id={`status-history-${entry.id}`}><h3>Riwayat status</h3><ol>
          <li><span>Terkirim</span><time>{dateTime.format(new Date(entry.sentAt))}</time></li>
          {entry.statusHistory?.map(change => <li key={change.id}><span>{statusLabel[change.status]}</span><time>{dateTime.format(new Date(change.changedAt))}</time></li>)}
        </ol></div>}
        {user && openChats.includes(Number(entry.id)) && <div className="submission-history-chat" id={`interest-chat-${entry.id}`}><InterestChat interestId={Number(entry.id)} role="public" onRead={() => setEntries(current => current?.map(item => item.id === entry.id ? { ...item, unreadCount: 0 } : item) || null)}/></div>}
      </article>)}</div>
    }
  </div>;
}
