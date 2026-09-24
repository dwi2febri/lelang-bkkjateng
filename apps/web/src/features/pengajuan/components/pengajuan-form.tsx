"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { asetService } from "@/features/aset/services/aset-service";
import type { Asset } from "@/features/aset/types";
import { pengajuanService } from "../services/pengajuan-service";
import { validatePengajuan } from "../schemas/pengajuan-schema";
import { errorMessage } from "@/services/api";
import { notify } from "@/store/notification-store";
export function PengajuanForm() {
  const router = useRouter();
  const [assetId, setAssetId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    asetService
      .list(controller.signal)
      .then((data) => setAssets(data.filter((a) => !a.archived)))
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      assetId: Number(data.get("assetId")),
      name: String(data.get("name")).trim(),
      email: String(data.get("email")).trim(),
      phone: String(data.get("phone")).trim(),
      message: String(data.get("message") || ""),
    };
    const issue = validatePengajuan(input);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await pengajuanService.create(input);
      notify("Pengajuan baru berhasil dicatat.");
      router.push(`/pengajuan/${result.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/pengajuan" className="admin-back">
        <ArrowLeft size={16} />
        Kembali ke pengajuan
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">CATAT PERMINTAAN INFORMASI</span>
          <h1>Pengajuan baru</h1>
          <p>
            Catat minat yang diterima melalui telepon atau komunikasi langsung.
          </p>
        </div>
      </div>
      <form
        className="admin-panel padded admin-form form-width searchable-form-panel"
        onSubmit={submit}
      >
        <h2>Informasi pemohon</h2>
        <div className="admin-form-grid">
          <Input
            label="Nama lengkap *"
            name="name"
            required
            minLength={2}
            maxLength={80}
          />
          <Input
            label="Alamat email *"
            type="email"
            name="email"
            required
            maxLength={150}
          />
          <Input
            label="Nomor telepon / WhatsApp *"
            name="phone"
            type="tel"
            required
            pattern="(\+62|0)[0-9]{8,13}"
            placeholder="08xxxxxxxxxx"
          />
          <Select label="Aset yang diminati *" name="assetId" value={assetId}
            onChange={setAssetId} disabled={loading}
            options={[{ value: "", label: loading ? "Memuat aset..." : "Pilih aset" },
              ...assets.map((a) => ({ value: String(a.id), label: `${a.code} \u00B7 ${a.title}` }))]} />
        </div>
        <label className="admin-field">
          <span>Pesan atau kebutuhan pemohon</span>
          <textarea
            name="message"
            rows={5}
            maxLength={1000}
            placeholder="Tuliskan informasi yang dibutuhkan pemohon…"
          />
        </label>
        <div className="admin-alert">
          <Info size={18} />
          <span>
            Pengajuan ini dicatat sebagai entri internal admin. Tidak ada
            notifikasi otomatis yang dikirim kepada pemohon.
          </span>
        </div>
        {error && (
          <div role="alert" className="admin-alert error">
            {error}
          </div>
        )}
        <div className="admin-form-actions">
          <Link
            href="/pengajuan"
            className="admin-button admin-button-secondary"
          >
            Batal
          </Link>
          <Button type="submit" disabled={busy || loading || !assets.length}>
            <Save size={16} />
            {busy ? "Menyimpan…" : "Simpan Pengajuan"}
          </Button>
        </div>
      </form>
    </>
  );
}
