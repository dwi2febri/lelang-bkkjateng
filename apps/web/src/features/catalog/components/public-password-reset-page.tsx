"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { accountRequest } from "../public-account";

export function PublicPasswordResetPage({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const validToken = /^[a-f0-9]{64}$/.test(token);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("Konfirmasi kata sandi tidak sama."); return; }
    setBusy(true);
    try {
      await accountRequest("reset-password", { token, password, confirmation });
      setDone(true);
      window.history.replaceState(null, "", "/atur-ulang-sandi");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Kata sandi belum berhasil diubah."); }
    finally { setBusy(false); }
  }
  return <main className="container public-account-page">
    <div className="public-breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/masuk">Masuk</Link><span>/</span><span>Atur ulang kata sandi</span></div>
    <section className="public-account-layout">
      <div className="public-account-intro"><span className="overline">AKUN PENGUNJUNG</span><h1>Atur ulang kata sandi</h1><p>Buat kata sandi baru untuk melanjutkan akses ke riwayat pengajuan, favorit, dan chat.</p><div className="public-account-benefit"><ShieldCheck size={20}/><span>Tautan dari email hanya berlaku 30 menit dan satu kali pemakaian.</span></div></div>
      <div className="public-account-card"><span className="public-account-card-icon"><LockKeyhole size={24}/></span><h2>Kata sandi baru</h2>
        {done ? <><p role="status" className="public-account-notice">Kata sandi berhasil diubah. Semua sesi lama telah diakhiri.</p><div className="public-account-switch"><Link href="/masuk">Masuk dengan kata sandi baru →</Link></div></> : validToken ? <><p>Gunakan kata sandi dengan minimal 12 karakter.</p><form className="public-account-form" onSubmit={submit}><label>Kata sandi baru<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} disabled={busy} onChange={event => setPassword(event.target.value)}/></label><label>Konfirmasi kata sandi<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)}/></label><button type="submit" className="primary-button" disabled={busy}>{busy ? "Menyimpan..." : "Simpan kata sandi baru"}<ArrowRight size={17}/></button></form>{error && <p role="alert" className="public-account-error">{error}</p>}</> : <><p role="alert" className="public-account-error">Tautan reset tidak valid. Hubungi pengelola untuk meminta tautan baru.</p><div className="public-account-switch"><Link href="/masuk">Kembali ke halaman masuk</Link></div></>}
      </div>
    </section>
  </main>;
}
