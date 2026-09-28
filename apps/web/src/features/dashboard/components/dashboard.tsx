"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Files,
  Clock3,
  CalendarDays,
  Plus,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { api, errorMessage } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { asetService } from "@/features/aset/services/aset-service";
import type { Asset } from "@/features/aset/types";
import type { Interest } from "@/features/pengajuan/types";
import { StatusBadge } from "@/features/approval/components/status-badge";
import { currency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
type Overview = {
  assets: { total: number; active: number; upcoming: number };
  interests: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
  };
  recent: Interest[];
};
export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null),
    [assets, setAssets] = useState<Asset[]>([]),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const [overview, list] = await Promise.all([
        api.get<Overview>("/admin/dashboard"),
        asetService.list(),
      ]);
      setData(overview.data);
      setAssets(
        list
          .filter((a): a is Asset & { auctionDate: string } =>
            !a.archived && a.saleMethod === "Lelang" && !!a.auctionDate && new Date(a.auctionDate).getTime() >= Date.now(),
          )
          .sort((a, b) => a.auctionDate.localeCompare(b.auctionDate))
          .slice(0, 3),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (error)
    return (
      <div className="admin-empty">
        <p role="alert">{error}</p>
        <Button onClick={load}>Coba lagi</Button>
      </div>
    );
  if (!data)
    return (
      <div className="admin-loading" role="status">
        <span className="admin-spinner" />
        Menyiapkan dashboard…
      </div>
    );
  const stats = [
    {
      title: "Aset aktif",
      value: data.assets.active,
      icon: Building2,
      detail: `${data.assets.total} total aset terdaftar`,
      tone: "blue",
    },
    {
      title: "Pengajuan masuk",
      value: data.interests.total,
      icon: Files,
      detail: "Seluruh pengajuan minat",
      tone: "teal",
    },
    {
      title: "Menunggu tindak lanjut",
      value: data.interests.pending,
      icon: Clock3,
      detail: "Pengajuan berstatus baru",
      tone: "gold",
    },
    {
      title: "Jadwal mendatang",
      value: data.assets.upcoming,
      icon: CalendarDays,
      detail: "Aset dengan jadwal mendatang",
      tone: "purple",
    },
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">RINGKASAN PORTAL LELANG</span>
          <h1>Dashboard</h1>
          <p>
            Selamat datang, {user?.name || "Administrator"}. Mari mulai hari
            yang produktif.
          </p>
        </div>
        <span className="dashboard-date">
          <CalendarDays size={16} />
          {formatDate(new Date().toISOString())}
        </span>
      </div>
      <section className="dashboard-welcome">
        <div>
          <span>KELOLA DENGAN LEBIH MUDAH</span>
          <h2>Setiap aset, sebuah peluang baru.</h2>
          <p>
            Perbarui katalog dan tanggapi minat untuk membantu calon peserta
            <br />
            menemukan aset yang tepat.
          </p>
          <Link href="/aset/baru" className="welcome-button">
            <Plus size={16} />
            Tambah Aset Baru
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="welcome-art">
          <Building2 size={150} strokeWidth={0.7} />
          <span>
            <CheckCircle2 size={27} />
          </span>
        </div>
      </section>
      <div className="dashboard-stats">
        {stats.map((s) => (
          <div className="stat-card" key={s.title}>
            <div>
              <span>{s.title}</span>
              <span className={"stat-icon " + s.tone}>
                <s.icon size={20} />
              </span>
            </div>
            <strong>{s.value}</strong>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Pengajuan terbaru</h2>
              <p>Permintaan informasi yang baru diterima.</p>
            </div>
            <Link href="/pengajuan">
              Lihat semua <ArrowUpRight size={15} />
            </Link>
          </div>
          {!data.recent.length ? (
            <div className="admin-empty dashboard-empty">
              <Inbox size={33} />
              <h3>Belum ada pengajuan</h3>
              <p>Minat yang dikirim melalui portal akan tampil di sini.</p>
              <Link href="/pengajuan/baru" className="table-action">
                Catat pengajuan pertama <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama & aset</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.asset_title}</small>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <Link
                          aria-label={`Detail pengajuan ${item.name}`}
                          className="table-action"
                          href={`/pengajuan/${item.id}`}
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="dashboard-processing">
            <span>
              <i />
              {data.interests.processing} sedang diproses
            </span>
            <span>
              <CheckCircle2 size={13} />
              {data.interests.completed} selesai ditindaklanjuti
            </span>
          </div>
        </section>
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Jadwal mendatang</h2>
              <p>Persiapkan informasi aset lebih awal.</p>
            </div>
            <CalendarDays size={21} />
          </div>
          <div className="upcoming-list">
            {assets.length ? (
              assets.map((a) => (
                <Link href={`/aset/${a.id}`} key={a.id}>
                  <img src={a.image} alt="Ilustrasi aset" />
                  <div>
                    <small>{a.auctionDate ? formatDate(a.auctionDate) : "Belum dijadwalkan"}</small>
                    <h3>{a.title}</h3>
                    <span>
                      {a.city} · {currency(a.price)}
                    </span>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <p className="admin-helper">Tidak ada jadwal mendatang.</p>
            )}
          </div>
          <Link href="/aset" className="panel-bottom-link">
            Kelola seluruh aset <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <div className="dashboard-info">
        <span>
          <CheckCircle2 size={20} />
        </span>
        <div>
          <strong>
            Katalog yang akurat membantu calon peserta mengambil langkah
            berikutnya.
          </strong>
          <p>
            Pastikan foto, dokumen, harga limit, serta jadwal sudah diperiksa
            sebelum dipublikasikan.
          </p>
        </div>
        <Link href="/aset">
          Periksa katalog <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
