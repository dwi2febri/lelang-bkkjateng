"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import { accountRequest, clearLatestApplicant, readLatestApplicant } from "../public-account";
import { usePublicFavorites } from "../public-favorites-provider";

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validPhone = (value: string) => /^(?:\+62|0)[0-9]{8,13}$/.test(value.trim());

export function PublicAccountPage({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const { refreshAccount } = usePublicFavorites();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const latest = readLatestApplicant();
    if (latest) { setName(latest.name); setEmail(latest.email); setPhone(latest.phone); }
  }, []);
  async function sendCode() {
    setError(""); setNotice(""); setVerified(false);
    if (!validEmail(email)) { setError("Masukkan alamat email yang valid."); return; }
    setBusy(true);
    try {
      const result = await accountRequest<{message:string}>("send-code", { email });
      setSent(true); setNotice(`${result.message} Periksa kotak masuk atau folder spam.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Kode belum dapat dikirim."); }
    finally { setBusy(false); }
  }
  async function verify() {
    setError("");
    if (!/^[0-9]{8}$/.test(code)) { setError("Masukkan kode verifikasi 8 angka dari email."); return; }
    setBusy(true);
    try {
      const preview = await accountRequest<{name:string;phone:string}>("preview", { email, code });
      if (preview.name) setName(preview.name);
      if (preview.phone) setPhone(preview.phone);
      setVerified(true); setNotice("Email terverifikasi. Lengkapi kata sandi untuk membuat akun.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Kode tidak valid."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!validEmail(email)) throw new Error("Masukkan alamat email yang valid.");
      if (mode === "register") {
        if (!verified) throw new Error("Verifikasi email dahulu.");
        if (name.trim().length < 2) throw new Error("Nama lengkap minimal 2 karakter.");
        if (!validPhone(phone)) throw new Error("Nomor WhatsApp harus menggunakan format 08... atau +62...");
        if (password.length < 12) throw new Error("Kata sandi minimal 12 karakter.");
        if (password.length > 128) throw new Error("Kata sandi maksimal 128 karakter.");
        if (password !== confirmation) throw new Error("Konfirmasi kata sandi belum sama.");
        await accountRequest("register", { name: name.trim(), email: email.trim(), phone: phone.trim(), code, password, confirmation });
        clearLatestApplicant();
      } else {
        if (!password) throw new Error("Masukkan kata sandi.");
        await accountRequest("login", { email: email.trim(), password });
      }
      await refreshAccount();
      router.push("/riwayat-pengajuan"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Belum berhasil. Coba kembali."); }
    finally { setBusy(false); }
  }
  return <main className="container public-account-page">
    <div className="public-breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/riwayat-pengajuan">History Pengajuan</Link><span>/</span><span>{mode === "register" ? "Daftar akun" : "Masuk"}</span></div>
    <section className="public-account-layout">
      <div className="public-account-intro"><span className="overline">AKUN PENGUNJUNG</span><h1>{mode === "register" ? "Simpan riwayat di satu akun" : "Selamat datang kembali"}</h1><p>{mode === "register" ? "Verifikasi email untuk menghubungkan pengajuan lama, lalu akses riwayat dan aset favorit dari perangkat lain." : "Masuk untuk melihat kembali pengajuan dan aset yang Anda sukai."}</p><div className="public-account-benefit"><ShieldCheck size={20}/><span>Riwayat pengajuan hanya dapat diakses setelah Anda masuk ke akun.</span></div></div>
      <div className="public-account-card"><span className="public-account-card-icon">{mode === "register" ? <MailCheck size={24}/> : <LockKeyhole size={24}/>}</span><h2>{mode === "register" ? "Daftar akun" : "Masuk akun"}</h2><p>{mode === "register" ? "Data pengajuan terakhir di browser ini akan terisi otomatis. Untuk pengajuan lama, nama dan WhatsApp terisi setelah email diverifikasi." : "Gunakan email dan kata sandi yang didaftarkan."}</p>
        <form onSubmit={submit} className="public-account-form" noValidate>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={e => {setEmail(e.target.value);setSent(false);setVerified(false);}} required maxLength={150} placeholder="nama@email.com" /></label>
          {mode === "register" && <>
            <button type="button" className="account-secondary" onClick={sendCode} disabled={busy}>{sent ? "Kirim ulang kode" : "Kirim kode verifikasi"}</button>
            {sent && <div className="public-account-code"><label>Kode verifikasi<input inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={code} onChange={e => {setCode(e.target.value);setVerified(false);}} placeholder="8 digit dari email" required /></label><button type="button" className="account-secondary" onClick={verify} disabled={busy}>Verifikasi</button></div>}
            {verified && <><label>Nama lengkap<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={80} required autoComplete="name" /></label><label>Nomor WhatsApp<input value={phone} onChange={e => setPhone(e.target.value)} pattern="(\\+62|0)[0-9]{8,13}" required autoComplete="tel" /></label></>}
          </>}
          {(mode === "login" || verified) && <><label>Kata sandi<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={mode === "register" ? 12 : 1} maxLength={128} required autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>{mode === "register" && <label>Konfirmasi kata sandi<input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required autoComplete="new-password" /></label>}<button type="submit" className="primary-button" disabled={busy}>{busy ? "Memproses..." : mode === "register" ? "Buat akun" : "Masuk"}<ArrowRight size={17}/></button></>}
        </form>
        {notice && <p className="public-account-notice" role="status">{notice}</p>}{error && <p className="public-account-error" role="alert">{error}</p>}
        <div className="public-account-switch">{mode === "register" ? <>Sudah punya akun? <Link href="/masuk">Masuk</Link></> : <>Belum punya akun? <Link href="/daftar">Daftar</Link></>}</div>
      </div>
    </section>
  </main>;
}
