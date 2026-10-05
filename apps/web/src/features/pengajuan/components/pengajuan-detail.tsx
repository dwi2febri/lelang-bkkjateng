"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageCircle, Building2, Clock3 } from "lucide-react";
import { pengajuanService } from "../services/pengajuan-service";
import type { Interest } from "../types";
import { errorMessage } from "@/services/api";
import {
  StatusBadge,
  statusLabels,
} from "@/features/approval/components/status-badge";
import { ApprovalForm } from "@/features/approval/components/approval-form";
import { currency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InterestChat } from "@/components/ui/interest-chat";
function whatsappNumber(phone: string): string | null {
  if (!/^[+\d\s()-]+$/.test(phone)) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{8,13}$/.test(digits)) return `62${digits.slice(1)}`;
  if (/^62\d{8,13}$/.test(digits)) return digits;
  return null;
}
export function PengajuanDetail({ id }: { id: string }) {
  const [interest, setInterest] = useState<Interest | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    pengajuanService
      .detail(id, controller.signal)
      .then(setInterest)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [id]);
  if (error)
    return (
      <div className="admin-empty">
        <p role="alert">{error}</p>
        <Link href="/pengajuan">Kembali ke daftar</Link>
      </div>
    );
  if (!interest) return <div className="admin-loading">Memuat pengajuan…</div>;
  const waNumber = whatsappNumber(interest.phone);
  return (
    <>
      <Link className="admin-back" href="/pengajuan">
        <ArrowLeft size={16} />
        Kembali ke pengajuan
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            PENGAJUAN #{interest.id.toString().padStart(4, "0")}
          </span>
          <h1>Detail pengajuan minat</h1>
          <p>
            Diterima {formatDate(interest.created_at)} ·{" "}
            {interest.source === "admin"
              ? "Dicatat oleh admin"
              : "Melalui portal publik"}
          </p>
        </div>
        <StatusBadge status={interest.status} />
      </div>
      <div className="admin-detail-grid">
        <div>
          <section className="admin-panel padded">
            <h2>Informasi pemohon</h2>
            <div className="detail-person">
              <span className="avatar large">{interest.name.slice(0, 1)}</span>
              <div>
                <h3>{interest.name}</h3>
                <span>Calon peminat aset</span>
              </div>
            </div>
            <div className="contact-grid">
              <a href={`mailto:${interest.email}`}>
                <Mail size={16} />
                {interest.email}
              </a>
              <div className="contact-phone">
                <a href={`tel:${interest.phone}`}>
                  <Phone size={16} />
                  {interest.phone}
                </a>
                {waNumber && <a className="whatsapp-link" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" aria-label={`Chat WhatsApp ${interest.phone}`} title="Chat via WhatsApp">
                  <span className="whatsapp-icon" aria-hidden="true"><MessageCircle size={20} /><Phone size={10} /></span>
                </a>}
              </div>
            </div>
            <div className="admin-divider" />
            <span className="admin-eyebrow">PESAN PEMOHON</span>
            <p className="message-box">
              {interest.message || "Tidak ada pesan tambahan."}
            </p>
            <p className="admin-helper">
              {interest.consent
                ? "Persetujuan penggunaan data kontak diberikan melalui formulir publik."
                : "Catatan internal admin; bukan persetujuan langsung dari pemohon."}
            </p>
          </section>
          <section className="admin-panel padded">
            <h2>Aset yang diminati</h2>
            <div className="interest-asset">
              <span>
                <Building2 size={25} />
              </span>
              <div>
                <small>
                  {interest.asset_code} · {interest.city}
                </small>
                <h3>{interest.asset_title}</h3>
                <strong>{currency(interest.price || 0)}</strong>
              </div>
            </div>
            {interest.asset_deleted_at?<p className="admin-helper">Aset berada di Recycle Bin. <Link href="/recycle-bin">Pulihkan aset</Link> agar kembali tersedia di portal dan chat.</p>:<Link href={`/aset/${interest.asset_id}`} className="table-action">
              Lihat informasi aset →
            </Link>}
          </section>
          <section className="admin-panel padded">
            <h2>Riwayat tindak lanjut</h2>
            {interest.history?.length ? (
              interest.history.map((item) => (
                <div className="history-item" key={item.id}>
                  <Clock3 size={17} />
                  <div>
                    <strong>{statusLabels[item.status]}</strong>
                    <p>
                      {item.notes ||
                        "Status diperbarui tanpa catatan tambahan."}
                    </p>
                    <small>
                      {item.admin_name} · {formatDate(item.created_at)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="admin-helper">Belum ada perubahan status.</p>
            )}
          </section>
          {!interest.asset_deleted_at && interest.public_user_id && (interest.status === "diproses" || interest.history?.some(item => item.status === "diproses")) && <section className="admin-panel padded"><InterestChat interestId={interest.id} role="admin" /></section>}
        </div>
        <section className="admin-panel padded sticky-panel searchable-form-panel">
          <h2>Tindak lanjut</h2>
          <p className="admin-helper">
            Perbarui status sesuai perkembangan komunikasi.
          </p>
          <ApprovalForm
            key={interest.version}
            interest={interest}
            onSaved={setInterest}
          />
        </section>
      </div>
    </>
  );
}
