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
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            {approval ? "KELOLA KOMUNIKASI" : "HUBUNGAN CALON PESERTA"}
          </span>
          <h1>{approval ? "Tindak lanjut pengajuan" : "Pengajuan minat"}</h1>
          <p>
            {approval
              ? "Tinjau pengajuan masuk dan catat perkembangan penanganannya."
              : "Seluruh permintaan informasi aset, tersusun dalam satu tempat."}
          </p>
        </div>
        <Link
          href="/pengajuan/baru"
          className="admin-button admin-button-primary"
        >
          <Plus size={17} />
          Pengajuan Baru
        </Link>
      </div>
      <div className="admin-panel pengajuan-list-panel">
        <div className="admin-table-toolbar">
          <form
            className="admin-search"
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(q);
              setPage(1);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Cari pengajuan"
              placeholder="Cari nama, email, atau aset…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit">Cari</button>
          </form>
          <Select label="Filter status" name="status" value={status}
            onChange={(value) => { setStatus(value); setPage(1); }}
            options={[{ value: "", label: "Semua status" },
              ...Object.entries(statusLabels).map(([key, label]) => ({ value: key, label }))]} />
        </div>
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
