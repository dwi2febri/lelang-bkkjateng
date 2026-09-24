import type { InterestStatus } from "@/features/pengajuan/types";
export const statusLabels: Record<InterestStatus, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};
export function StatusBadge({ status }: { status: InterestStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
