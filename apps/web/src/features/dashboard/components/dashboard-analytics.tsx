"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChartColumn, ChartPie, Gem } from "lucide-react";
import type { Asset } from "@/features/aset/types";
import { useCategories } from "@/features/categories/categories";
import { currency } from "@/lib/utils";
import { getDashboardAnalytics } from "../analytics";
import { DashboardAssetMap } from "./dashboard-asset-map";

const colors = ["#1c668f", "#8b6cc0", "#26988a", "#d49a38", "#d97973", "#65859c", "#6f965b"];
const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

export function DashboardAnalytics({ assets }: { assets: Asset[] }) {
  const summary = useMemo(() => getDashboardAnalytics(assets), [assets]);
  const categories = useCategories();
  const [metric, setMetric] = useState<"total" | "count">("total");
  const [limit, setLimit] = useState(5);
  const max = Math.max(1, ...summary.methods.map(group => group[metric]));
  let offset = 0;
  const segments = summary.categories.map((group, index) => {
    const start = offset;
    offset += summary.active.length ? group.count / summary.active.length * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${offset}%`;
  });
  const categoryLabel = (name: string) => categories.find(category => category.name === name)?.label || name;

  return <div className="dashboard-analytics">
    <div className="dashboard-analytics-heading"><div><h2>Ringkasan portofolio aset</h2><p>Jumlah dan nominal berdasarkan harga akhir / limit aset aktif.</p></div><strong>{currency(summary.total)}<small>Total nominal · {summary.active.length} aset</small></strong></div>
    <div className="dashboard-chart-grid">
      <section className="admin-panel dashboard-chart-panel">
        <div className="panel-heading"><div><h2>Metode penjualan</h2><p>Bandingkan nominal dan jumlah setiap metode.</p></div><ChartColumn size={21}/></div>
        <div className="dashboard-chart-tabs" role="group" aria-label="Ukuran grafik metode penjualan"><button type="button" aria-pressed={metric === "total"} onClick={() => setMetric("total")}>Nominal (Rp)</button><button type="button" aria-pressed={metric === "count"} onClick={() => setMetric("count")}>Jumlah aset</button></div>
        <div className="dashboard-bars">{summary.methods.map((group, index) => <div className="dashboard-bar-row" key={group.name}>
          <div><span>{group.name}</span><strong>{metric === "total" ? currency(group.total) : `${group.count} aset`}</strong></div>
          <div className="dashboard-bar-track" aria-hidden="true"><span style={{ width: `${group[metric] / max * 100}%`, background: colors[index % colors.length] }}/></div>
          <small>{metric === "total" ? `${group.count} aset` : currency(group.total)}</small>
        </div>)}</div>
        <div className="dashboard-chart-scale"><span>0</span><span>{metric === "total" ? `Rp ${compact.format(max)}` : `${max} aset`}</span></div>
      </section>
      <section className="admin-panel dashboard-chart-panel">
        <div className="panel-heading"><div><h2>Jenis aset berdasarkan kategori</h2><p>Komposisi jumlah aset aktif.</p></div><ChartPie size={21}/></div>
        <div className="dashboard-category-chart"><div className="dashboard-donut" style={{ background: segments.length ? `conic-gradient(${segments.join(",")})` : "#eaf0f5" }} aria-hidden="true"><div><strong>{summary.active.length}</strong><span>aset aktif</span></div></div>
          <ul className="dashboard-chart-legend">{summary.categories.map((group, index) => <li key={group.name}><i style={{ background: colors[index % colors.length] }}/><div><span>{categoryLabel(group.name)}</span><small>{currency(group.total)}</small></div><strong>{group.count}<small>{Math.round(group.count / summary.active.length * 100)}%</small></strong></li>)}</ul>
        </div>
        {!summary.active.length && <p className="dashboard-analytics-empty">Belum ada aset aktif untuk ditampilkan.</p>}
      </section>
    </div>
    <section className="admin-panel dashboard-high-value">
      <div className="panel-heading"><div><h2><Gem size={18}/> Aset di atas Rp1 miliar</h2><p>{summary.highValue.length} aset · Total {currency(summary.highValue.reduce((sum, asset) => sum + Number(asset.price), 0))}</p></div></div>
      {summary.highValue.length ? <><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Aset</th><th>Kategori</th><th>Metode</th><th>Harga akhir / limit</th><th><span className="dashboard-visually-hidden">Detail</span></th></tr></thead><tbody>{summary.highValue.slice(0, limit).map(asset => <tr key={asset.id}><td><strong>{asset.title}</strong><small>{asset.code} · {asset.city}</small></td><td>{categoryLabel(asset.category)}</td><td>{asset.saleMethod}</td><td><strong>{currency(asset.price)}</strong></td><td><Link className="table-action" href={`/aset/${asset.id}`} aria-label={`Detail ${asset.title}`}><ArrowUpRight size={17}/></Link></td></tr>)}</tbody></table></div>{summary.highValue.length > limit && <button className="dashboard-show-more" type="button" onClick={() => setLimit(value => value + 5)}>Tampilkan lebih banyak ({summary.highValue.length - limit} aset)</button>}</> : <p className="dashboard-analytics-empty">Belum ada aset aktif dengan harga di atas Rp1 miliar.</p>}
    </section>
    <DashboardAssetMap assets={summary.active}/>
  </div>;
}
