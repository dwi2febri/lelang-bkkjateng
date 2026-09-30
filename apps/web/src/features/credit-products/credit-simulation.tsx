"use client";
import {useState} from 'react';
import {creditTerms,creditCalculation,type CreditProduct,type CreditMethod} from './calculator';
const money=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
export function CreditSimulation({price,product}:{price:number;product:CreditProduct}) {
 const [tenor,setTenor]=useState('60'),[audience,setAudience]=useState('external'),[method,setMethod]=useState<CreditMethod>('flat');
 const months=Number(tenor),principal=price;
 const terms=creditTerms(product,months,method,audience);
 const result=terms?creditCalculation(principal,months,terms.rate,terms.method):null;
 return <section className="asset-detail-panel" id="kalkulator">
  <h2>Simulasi pembiayaan · {product.name}</h2><p>{product.description||'Bunga dan metode mengikuti ketentuan produk untuk tenor yang dipilih.'}</p>
  <div className="asset-calculator">
   <label>Harga aset<input readOnly value={money(price)}/></label>
   <label>Jangka waktu (bulan)<input type="number" min={1} max={1200} step={1} value={tenor} onChange={event=>{setTenor(event.target.value);const next=creditTerms(product,Number(event.target.value),terms?.method||method,audience);if(next)setMethod(next.method);}}/></label>
   {product.requiresEmployee&&<label>Status pegawai<select value={audience} onChange={event=>{setAudience(event.target.value);const next=creditTerms(product,months,terms?.method||method,event.target.value);if(next)setMethod(next.method);}}><option value="external">Pegawai Eksternal</option><option value="internal">Pegawai Internal</option></select></label>}
   <label>Metode perhitungan<select value={terms?.method||method} onChange={event=>setMethod(event.target.value as CreditMethod)}><option value="flat" disabled={!!terms&&terms.rule.flatRate===null}>Flat</option><option value="anuitas" disabled={!!terms&&terms.rule.annuityRate===null}>Anuitas</option></select></label>
   <label>Bunga per tahun (%)<input readOnly value={terms?String(terms.rate):'—'}/></label>
  </div>
  {terms&&terms.method!==method&&<p className="asset-detail-muted">Metode otomatis mengikuti ketentuan produk: {terms.method==='flat'?'Flat':'Anuitas'}.</p>}
  {terms&&<p className="asset-detail-muted">{terms.method==='flat'?'Rumus flat: angsuran = pokok pembiayaan ÷ tenor bulan + pokok pembiayaan × bunga tahunan ÷ 1.200.':'Rumus anuitas: angsuran = P × r ÷ (1 − (1 + r)⁻ⁿ), dengan P = pokok pembiayaan, r = bunga tahunan ÷ 1.200, dan n = tenor bulan. Untuk bunga 0%, angsuran = P ÷ n.'}</p>}
  <div className="asset-calculator-result" role="status">{result?<><span>Estimasi angsuran per bulan</span><strong>{money(result.payment)}</strong><small>Pokok pembiayaan: {money(principal)} · Total bunga: {money(result.totalInterest)} · Total pembayaran: {money(result.totalPayment)}</small></>:<span>{!terms?'Tenor belum sesuai rentang yang tersedia pada produk ini.':'Harga aset belum valid untuk simulasi pembiayaan.'}</span>}</div>
  {result&&<details className="credit-schedule"><summary>Rincian angsuran {months} bulan</summary><div><table><thead><tr><th>Bulan</th><th>Pokok</th><th>Bunga</th><th>Angsuran</th><th>Sisa pokok</th></tr></thead><tbody>{result.schedule.map(row=><tr key={row.month}><td>{row.month}</td><td>{money(row.capital)}</td><td>{money(row.interest)}</td><td>{money(row.payment)}</td><td>{money(row.balance)}</td></tr>)}</tbody></table></div></details>}
  <p className="asset-detail-muted">Simulasi {terms?.method==='flat'?'flat':'anuitas'} dengan asumsi bunga tetap, belum termasuk biaya lain. Ketentuan dan kelayakan pengajuan dikonfirmasi oleh petugas BKK Jateng.</p>
 </section>;
}
