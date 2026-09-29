"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Pencil, Plus, Search, ShieldCheck, Users, UserRound } from "lucide-react";
import { api, errorMessage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

type UserType = "internal" | "external";
type ManagedUser = { id: number; name: string; email: string; phone?: string; active: number; created_at: string; submissionCount?: number };
type UserForm = { id?: number; name: string; email: string; password: string };
const tabs = [{ type: "internal", label: "Manajemen User Internal", icon: ShieldCheck }, { type: "external", label: "Manajemen User Eksternal", icon: Users }] as const;

export function UserManagement() {
  const current = useAuthStore();
  const [type, setType] = useState<UserType>("internal");
  const [search, setSearch] = useState(""), [query, setQuery] = useState(""), [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: ManagedUser[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0), [busy, setBusy] = useState(false);
  const [form, setForm] = useState<UserForm | null>(null), [formError, setFormError] = useState("");
  const formPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api.get("/admin/users", { params: { type, q: query, page }, signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) setResult(response.data);
    }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [type, query, page, reload]);
  function chooseTab(next: UserType) {
    if (busy || next === type) return;
    setLoading(true); setType(next); setSearch(""); setQuery(""); setPage(1); setForm(null); setFormError(""); setNotice("");
  }
  function edit(user?: ManagedUser) {
    setForm({ id: user?.id, name: user?.name || "", email: user?.email || "", password: "" });
    setFormError(""); setNotice("");
    requestAnimationFrame(() => { formPanel.current?.scrollIntoView({ behavior: "smooth", block: "center" }); formPanel.current?.querySelector("input")?.focus(); });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true); setFormError("");
    try {
      const data = { name: form.name, email: form.email, ...(form.password ? { password: form.password } : {}) };
      if (form.id) await api.patch(`/admin/users/internal/${form.id}`, data);
      else await api.post("/admin/users/internal", data);
      if (type === "internal" && current && form.id === current.id && (form.password || form.email.trim().toLowerCase() !== current.email)) {
        window.location.assign("/login"); return;
      }
      setNotice(form.id ? "Perubahan user berhasil disimpan." : "User internal berhasil ditambahkan.");
      setForm(null); setReload(value => value + 1);
    } catch (error) { setFormError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function toggle(user: ManagedUser) {
    if (busy) return;
    setBusy(true); setNotice(""); setError("");
    try {
      await api.patch(`/admin/users/${type}/${user.id}/active`, { active: !user.active });
      setNotice(user.active ? "User dinonaktifkan dan sesi loginnya diakhiri." : "User diaktifkan kembali.");
      setReload(value => value + 1);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function resetPassword(user: ManagedUser) {
    if (busy || !user.active) return;
    setBusy(true); setNotice(""); setError("");
    try {
      await api.post(`/admin/users/external/${user.id}/reset-password`);
      setNotice(`Tautan reset kata sandi telah dikirim ke ${user.email}.`);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <>
    <section className="admin-panel admin-filter-card">
      <div className="admin-filter-card-header"><div><span className="admin-eyebrow">PENGELOLAAN AKUN</span><h1>Manajemen User</h1><p>Kelola akses pengguna dashboard dan akun pengaju di portal publik.</p></div><Users size={28}/></div>
      <div className="user-management-tabs" role="tablist" aria-label="Jenis pengguna">
        {tabs.map((tab, index) => <button key={tab.type} type="button" role="tab" id={`user-tab-${tab.type}`} aria-controls="user-management-panel" aria-selected={type === tab.type} tabIndex={type === tab.type ? 0 : -1} disabled={busy} onClick={() => chooseTab(tab.type)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
          chooseTab(tabs[next].type); document.getElementById(`user-tab-${tabs[next].type}`)?.focus();
        }}><tab.icon size={18}/>{tab.label}</button>)}
      </div>
    </section>
    <section id="user-management-panel" role="tabpanel" aria-labelledby={`user-tab-${type}`}>
      <div className="admin-panel user-management-toolbar">
        <div><h2>{type === "internal" ? "User internal" : "User eksternal"}</h2><p>{type === "internal" ? "Akun administrator yang memiliki akses dashboard pengelolaan." : "Akun pengaju yang terdaftar melalui portal publik. Aksesnya meliputi favorit, history pengajuan, dan chat."}</p></div>
        <form className="admin-search" onSubmit={event => { event.preventDefault(); setQuery(search); setPage(1); }}><Search size={17}/><input aria-label="Cari user" placeholder="Cari nama atau email..." maxLength={100} value={search} onChange={event => setSearch(event.target.value)}/><button type="submit">Cari</button></form>
        {type === "internal" && <Button disabled={busy} onClick={() => edit()}><Plus size={16}/>Tambah User Internal</Button>}
      </div>
      {notice && <p className="admin-panel user-management-notice" role="status">{notice}</p>}
      {type === "internal" && form && <section ref={formPanel} className="admin-panel padded user-management-editor" aria-label={form.id ? "Ubah user" : "Tambah user"}>
        <h2>{form.id ? "Ubah" : "Tambah"} user internal</h2>
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form-grid">
            <label className="admin-field">Nama lengkap<input required minLength={2} maxLength={80} value={form.name} disabled={busy} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
            <label className="admin-field">Email<input type="email" required maxLength={150} value={form.email} disabled={busy} onChange={event => setForm({ ...form, email: event.target.value })}/></label>
            <label className="admin-field">{form.id ? "Kata sandi baru (opsional)" : "Kata sandi"}<input type="password" autoComplete="new-password" required={!form.id} minLength={12} maxLength={128} value={form.password} disabled={busy} onChange={event => setForm({ ...form, password: event.target.value })}/><small>Minimal 12 karakter.{form.id ? " Kosongkan jika tidak diubah. Mengubah email atau kata sandi akan mengakhiri sesi login." : ""}</small></label>
          </div>
          {formError && <p role="alert" className="admin-alert">{formError}</p>}
          <div className="admin-form-actions"><Button variant="secondary" disabled={busy} onClick={() => setForm(null)}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan User"}</Button></div>
        </form>
      </section>}
      <div className="admin-panel">
        {error ? <div className="admin-empty" role="alert"><p>{error}</p><Button onClick={() => setReload(value => value + 1)}>Coba lagi</Button></div> : loading ? <div className="admin-loading" role="status"><span className="admin-spinner"/>Memuat user...</div> : !result.data.length ? <div className="admin-empty"><UserRound size={32}/><h3>Tidak ada user ditemukan</h3><p>{query ? "Coba kata pencarian lainnya." : "Akun yang terdaftar akan tampil di sini."}</p></div> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Nama</th><th>Email</th><th>{type === "internal" ? "Akses" : "WhatsApp"}</th>{type === "external" && <th>Pengajuan</th>}<th>Status akun</th><th>Terdaftar</th><th>Aksi</th></tr></thead><tbody>
          {result.data.map(user => <tr key={user.id}><td><strong>{user.name}</strong>{type === "internal" && current?.id === user.id && <small>Akun Anda</small>}</td><td>{user.email}</td><td>{type === "internal" ? "Administrator" : user.phone}</td>{type === "external" && <td>{user.submissionCount || 0}</td>}<td><span className={`status-badge ${user.active ? "status-selesai" : "status-archived"}`}><i/>{user.active ? "Aktif" : "Nonaktif"}</span></td><td>{formatDate(user.created_at)}</td><td><div className="user-management-actions">{type === "internal" ? <Button variant="secondary" disabled={busy} onClick={() => edit(user)}><Pencil size={14}/>Ubah</Button> : <Button variant="secondary" disabled={busy || !user.active} title={!user.active ? "Aktifkan akun sebelum mengirim reset kata sandi" : undefined} onClick={() => resetPassword(user)}><KeyRound size={14}/>Reset Password</Button>}<Button variant="secondary" disabled={busy || (type === "internal" && current?.id === user.id)} onClick={() => toggle(user)}>{user.active ? "Nonaktifkan" : "Aktifkan"}</Button></div></td></tr>)}
        </tbody></table></div>}
        <div className="admin-pagination"><span>{loading ? "Memuat..." : `${result.total} user · Halaman ${page} dari ${Math.max(1, Math.ceil(result.total / 20))}`}</span><div><Button variant="secondary" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={16}/></Button><Button variant="secondary" disabled={loading || page * 20 >= result.total} onClick={() => setPage(value => value + 1)} aria-label="Halaman berikutnya"><ChevronRight size={16}/></Button></div></div>
      </div>
    </section>
  </>;
}
