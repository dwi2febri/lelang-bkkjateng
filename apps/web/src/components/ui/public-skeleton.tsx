import type { ReactNode } from "react";

export function Skeleton({ className = "", width }: { className?: string; width?: string }) {
  return <span aria-hidden="true" className={`ghost ${className}`} style={width ? { width } : undefined} />;
}
function LoadingRegion({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return <div className={className} role="status" aria-label={label} aria-busy="true"><div aria-hidden="true">{children}</div></div>;
}
export function AssetGridSkeleton({ count = 4 }: { count?: number }) {
  return <LoadingRegion label="Memuat aset"><div className="asset-grid">{Array.from({ length: count }, (_, index) => <div className="asset-card ghost-card" key={index}>
    <div className="card-photo"><Skeleton className="ghost-photo"/><Skeleton className="ghost-favorite"/></div>
    <div className="card-content"><Skeleton width="48%"/><Skeleton className="ghost-title" width="82%"/><div className="ghost-row"><Skeleton width="42%"/><Skeleton width="38%"/></div><Skeleton width="24%"/><Skeleton className="ghost-price" width="65%"/><div className="ghost-footer"><Skeleton width="46%"/><Skeleton className="ghost-square"/></div></div>
  </div>)}</div></LoadingRegion>;
}
export function ListSkeleton({ count = 3, kind = "schedule" }: { count?: number; kind?: "schedule" | "history" }) {
  return <LoadingRegion label={kind === "history" ? "Memuat riwayat pengajuan" : "Memuat jadwal lelang"} className="ghost-list-region"><div className={`ghost-list ghost-list-${kind}`}>{Array.from({ length: count }, (_, index) => <div className="ghost-list-item" key={index}>
    <Skeleton className="ghost-list-image"/><div className="ghost-list-copy"><Skeleton width="28%"/><Skeleton className="ghost-title" width="75%"/><Skeleton width="48%"/></div><Skeleton className="ghost-button"/>
  </div>)}</div></LoadingRegion>;
}
export function AssetDetailSkeleton() {
  return <LoadingRegion label="Memuat detail aset" className="container ghost-detail"><Skeleton width="25%"/><div className="ghost-detail-grid"><div><Skeleton className="ghost-gallery"/><div className="ghost-thumbnails">{[1,2,3,4].map(value => <Skeleton key={value}/>)}</div><Skeleton className="ghost-title" width="55%"/><Skeleton width="90%"/><Skeleton width="75%"/></div><div className="ghost-detail-panel"><Skeleton className="ghost-title" width="90%"/><Skeleton width="45%"/><Skeleton className="ghost-price" width="75%"/>{[1,2,3,4].map(value => <Skeleton key={value} width="85%"/>)}<Skeleton className="ghost-button"/><Skeleton className="ghost-button"/></div></div></LoadingRegion>;
}
export function GuideSkeleton() {
  return <LoadingRegion label="Memuat panduan lelang" className="container guide-public ghost-guide"><Skeleton width="25%"/><Skeleton className="ghost-title" width="55%"/>{[1,2,3].map(value => <div className="ghost-guide-section" key={value}><Skeleton className="ghost-title" width="35%"/><Skeleton/><Skeleton width="95%"/><Skeleton width="75%"/></div>)}</LoadingRegion>;
}
