"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ArrowUpRight,
  Files,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { usePengajuan } from "../hooks/use-pengajuan";
import {
  StatusBadge,
  statusLabels,
} from "@/features/approval/components/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
export function PengajuanList({ approval = false }: { approval?: boolean }) {
  const [q, setQ] = useState(""),
    [term, setTerm] = useState(""),
    [status, setStatus] = useState(approval ? "baru" : ""),
    [page, setPage] = useState(1);
  const { result, loading, error, reload } = usePengajuan(term, status, page);
  return (
    <>
      <section className="admin-panel admin-filter-card pengajuan-filter-card" aria-label="Filter pengajuan">
        <div className="admin-filter-card-header">
          <div>
            <span className="admin-eyebrow">
              {approval ? "KELOLA KOMUNIKASI" : "HUBUNGAN CALON PESERTA"}
            </span>
            <h1>{approval ? "Tindak lanjut pengajuan" : "Pengajuan minat"}</h1>
            <p>{approval
              ? "Tinjau pengajuan masuk dan catat perkembangan penanganannya."
              : "Seluruh permintaan informasi aset, tersusun dalam satu tempat."}</p>
          </div>
          <div className="admin-filter-card-actions">
            <span className="admin-filter-total">Total: <strong>{result.total}</strong> pengajuan</span>
            <Link href="/pengajuan/baru" className="admin-button admin-button-primary">
              <Plus size={17} />Pengajuan Baru
            </Link>
          </div>
        </div>
        <div className="pengajuan-filter-grid">
          <div className="pengajuan-filter-search">
            <label htmlFor="admin-pengajuan-search">Cari pengajuan</label>
            <form className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                setTerm(q);
                setPage(1);
              }}
            >
              <Search size={17} />
              <input
                id="admin-pengajuan-search"
                placeholder="Cari nama, email, atau aset…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit">Cari</button>
            </form>
          </div>
          <Select label="Filter status" name="status" value={status}
            onChange={(value) => { setStatus(value); setPage(1); }}
            options={[{ value: "", label: "Semua status" },
              ...Object.entries(statusLabels).map(([key, label]) => ({ value: key, label }))]} />
          <div className="asset-filter-reset-slot"><button type="button" className="asset-filter-reset" disabled={!q && !term && status === (approval ? "baru" : "")}
            onClick={() => { setQ(""); setTerm(""); setStatus(approval ? "baru" : ""); setPage(1); }}><RotateCcw size={15} />Reset filter</button></div>
        </div>
      </section>
      <div className="admin-panel pengajuan-list-panel">
        {error ? (
          <div className="admin-empty" role="alert">
            <p>{error}</p>
            <Button onClick={reload}>Coba lagi</Button>
          </div>
        ) : loading ? (
          <div className="admin-loading" role="status">
            <span className="admin-spinner" />
            Memuat pengajuan…
          </div>
        ) : !result.data.length ? (
          <div className="admin-empty">
            <Files size={35} />
            <h3>
              Belum ada pengajuan{" "}
              {status &&
                statusLabels[status as keyof typeof statusLabels].toLowerCase()}
            </h3>
            <p>Pengajuan dari portal dan catatan admin akan tampil di sini.</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pemohon</th>
                  <th>Status Login</th>
                  <th>Aset diminati</th>
                  <th>Tanggal masuk</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-person">
                        <span className="avatar soft">
                          {item.name.slice(0, 1)}
                        </span>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`applicant-account-badge ${item.public_user_id ? "registered" : "guest"}`}
                        title={item.public_user_id ? "Pengajuan terhubung ke akun terdaftar" : "Pengajuan belum terhubung ke akun terdaftar"}>
                        {item.public_user_id ? <UserRoundCheck size={14} aria-hidden="true" /> : <UserRound size={14} aria-hidden="true" />}
                        {item.public_user_id ? "Sudah login" : "Belum punya akun"}
                      </span>
                    </td>
                    <td>
                      <strong>{item.asset_title}</strong>
                      <small>
                        {item.asset_code} · #{item.id}
                      </small>
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <Link
                        className="table-action"
                        href={`/pengajuan/${item.id}`}
                      >
                        Detail <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <span>
            {result.total} pengajuan · Halaman {page} dari{" "}
            {Math.max(1, Math.ceil(result.total / 20))}
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              disabled={page * 20 >= result.total || loading}
              onClick={() => setPage(page + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
