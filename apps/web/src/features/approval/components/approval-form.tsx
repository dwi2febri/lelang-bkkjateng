"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { errorMessage } from "@/services/api";
import { notify } from "@/store/notification-store";
import type { Interest, InterestStatus } from "@/features/pengajuan/types";
import { saveApproval } from "../services/approval-service";
import { statusLabels } from "./status-badge";
export function ApprovalForm({
  interest,
  onSaved,
}: {
  interest: Interest;
  onSaved: (value: Interest) => void;
}) {
  const [status, setStatus] = useState<InterestStatus>(interest.status),
    [notes, setNotes] = useState(interest.admin_notes || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "ditolak" && !notes.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await saveApproval(interest.id, {
        status,
        notes,
        version: interest.version,
      });
      onSaved(result);
      notify("Status pengajuan berhasil diperbarui.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="admin-form">
      <Select label="Status pengajuan" name="status" value={status}
        onChange={(value) => setStatus(value as InterestStatus)}
        options={Object.entries(statusLabels).map(([key, label]) => ({ value: key, label }))} />
      <label className="admin-field">
        <span>Catatan tindak lanjut {status === "ditolak" && "*"}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          required={status === "ditolak"}
          placeholder="Catat hasil komunikasi atau langkah selanjutnya…"
          rows={5}
        />
      </label>
      <p className="admin-helper">
        Status ini untuk tindak lanjut minat, bukan penetapan pemenang lelang.
      </p>
      {error && (
        <div className="admin-alert error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => window.location.reload()}>
            Muat ulang
          </button>
        </div>
      )}
      <Button type="submit" disabled={busy}>
        <Save size={16} />
        {busy ? "Menyimpan…" : "Simpan Tindak Lanjut"}
      </Button>
    </form>
  );
}
