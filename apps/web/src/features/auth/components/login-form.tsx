"use client";
import { BrandLogo } from "@/components/ui/brand-logo";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { validateLogin } from "../schemas/login-schema";
import { errorMessage } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function LoginForm() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const { login } = useAuth();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || ""),
    };
    const issue = validateLogin(input);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(input);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/" className="admin-brand">
          <BrandLogo />
        </Link>
        <div className="login-story-content">
          <span className="login-kicker">RUANG KERJA ADMINISTRATOR</span>
          <h1>
            Kelola aset.
            <br />
            Buka lebih banyak
            <br />
            <em>peluang.</em>
          </h1>
          <p>
            Satu ruang kerja untuk mengelola informasi aset dan membangun
            hubungan dengan calon peserta lelang.
          </p>
          <div className="login-story-feature">
            <ShieldCheck size={24} />
            <div>
              <strong>Akses khusus pengelola</strong>
              <span>Informasi terjaga, pekerjaan lebih terarah.</span>
            </div>
          </div>
        </div>
        <small>© {new Date().getFullYear()} BKK Jateng · Portal Lelang</small>
      </section>
      <section className="login-panel">
        <Link className="login-back" href="/">
          <ArrowLeft size={16} />
          Kembali ke portal
        </Link>
        <div className="login-form-wrap">
          <span className="login-lock">
            <LockKeyhole size={24} />
          </span>
          <span className="overline">SELAMAT DATANG KEMBALI</span>
          <h2>Masuk ke admin</h2>
          <p>Gunakan akun administrator untuk melanjutkan.</p>
          <form onSubmit={submit}>
            <Input
              label="Alamat email"
              name="email"
              type="email"
              placeholder="admin@bkkjateng.local"
              autoComplete="username"
              maxLength={150}
              required
            />
            <div className="password-field">
              <Input
                label="Kata sandi"
                name="password"
                type={show ? "text" : "password"}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                maxLength={128}
                required
              />
              <button
                type="button"
                aria-label={
                  show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <div role="alert" className="admin-alert error">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Memeriksa akun…" : "Masuk ke Dashboard"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="login-help">
            <ShieldCheck size={16} />
            <span>
              Akses terbatas bagi petugas yang berwenang.
              <br />
              Hubungi pengelola sistem jika membutuhkan akun.
            </span>
          </div>
        </div>
        <span className="login-panel-bottom">BKK JATENG · ADMINISTRATION</span>
      </section>
    </main>
  );
}
