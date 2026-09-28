"use client";
import {useState} from "react";
import {useDragSort} from "@/components/ui/use-drag-sort";
import {IconPicker} from "@/components/ui/icon-picker";
import {CatalogIcon} from "@/components/ui/catalog-icon";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {defaultCategorySettings, templateLabels, legacySpecKeys, specificationIcon, facilityIcon, type CategorySettings, type SpecField} from "./settings";
const sectionLabels: Record<keyof CategorySettings["sections"],string>={description:"Deskripsi",specs:"Spesifikasi",location:"Lokasi",facilities:"Akses / kelengkapan",scheme:"Skema pembelian",calculator:"Kalkulator pembiayaan",financing:"Tombol pembiayaan"};
export function CategorySettingsEditor({value,onChange}:{value:CategorySettings;onChange:(v:CategorySettings)=>void}) {
 const [preset,setPreset]=useState(value.template);
 const patch=(key:keyof CategorySettings,v:unknown)=>onChange({...value,[key]:v});
 const facilitySort=useDragSort(value.facilities.length,(from,to)=>{const facilities=[...value.facilities];const [item]=facilities.splice(from,1);facilities.splice(to,0,item);patch("facilities",facilities);});
 function changeField(index:number,change:Partial<SpecField>) {patch("fields",value.fields.map((f,i)=>i===index?{...f,...change}:f));}
 function updateFacility(index:number,name:string) {const old=value.facilities[index];const icons={...value.facilityIcons};const icon=icons[old];delete icons[old];if(icon)icons[name]=icon;onChange({...value,facilities:value.facilities.map((v,i)=>i===index?name:v),facilityIcons:icons});}
 function removeFacility(index:number) {const icons={...value.facilityIcons};delete icons[value.facilities[index]];onChange({...value,facilities:value.facilities.filter((_,i)=>i!==index),facilityIcons:icons});}
 function move(index:number,direction:number) {const fields=[...value.fields];[fields[index],fields[index+direction]]=[fields[index+direction],fields[index]];patch("fields",fields);}
 return <div className="category-settings-editor">
  <section className="category-config-section"><h3>Template kategori</h3><p>Gunakan template sebagai awal, kemudian atur kolom dan tampilan sesuai kebutuhan. Menerapkan template mengganti pengaturan di bawah; data aset tetap tersimpan.</p>
   <div className="category-config-preset"><Select name="categoryTemplate" label="Template" value={preset} onChange={setPreset} options={Object.entries(templateLabels).map(([value,label])=>({value,label}))}/><button type="button" className="outline-button" onClick={()=>onChange(defaultCategorySettings("",preset))}>Terapkan template</button></div>
  </section>
  <details className="category-config-section" open><summary>Label & bagian halaman detail</summary>
   <div className="category-config-grid">{([
    ["descriptionLabel","Judul deskripsi"],["descriptionHint","Petunjuk pengisian deskripsi"],["specsLabel","Judul spesifikasi"],["certificateLabel","Label dokumen"],["certificateHint","Contoh dokumen"],["facilitiesLabel","Judul akses / kelengkapan"],["contactLabel","Teks tombol hubungi"],["financingLabel","Teks tombol pembiayaan"]] as const).map(([key,label])=><Input key={key} label={label} required maxLength={300} value={value[key]} onChange={e=>patch(key,e.target.value)}/>)}</div>
   <div className="category-config-toggles">{Object.entries(sectionLabels).map(([key,label])=><label key={key}><input type="checkbox" checked={value.sections[key as keyof typeof sectionLabels]} onChange={e=>patch("sections",{...value.sections,[key]:e.target.checked})}/>{label}</label>)}</div>
   <small>Bagian yang dinonaktifkan tidak muncul pada detail dan preview. Pilihan akses / kelengkapan juga disembunyikan dari form.</small>
  </details>
  <section className="category-config-section"><h3>Kolom spesifikasi</h3><p>Atur kolom form, kewajiban isi, satuan, urutan, dan ringkasan di samping harga. Kode kolom menghubungkan data aset; gunakan kode yang sama untuk mempertahankan nilai lama.</p>
   {value.fields.map((f,index)=><details key={index} className="category-spec-editor"><summary><CatalogIcon name={specificationIcon(f.key,f.icon)} size={19}/>{index+1}. {f.label||"Kolom baru"} <small>{f.enabled?f.type:"Nonaktif"}</small></summary>
    <IconPicker label={`Ikon ${f.label||"spesifikasi"}`} value={specificationIcon(f.key,f.icon)} onChange={icon=>changeField(index,{icon})}/>
    <div className="category-config-grid">
     <Input label="Kode kolom" required pattern="[a-zA-Z][a-zA-Z0-9_]{0,39}" value={f.key} onChange={e=>changeField(index,{key:e.target.value})}/>
     <Input label="Label kolom" required maxLength={80} value={f.label} onChange={e=>changeField(index,{label:e.target.value})}/>
     <Select name={`field-type-${index}`} label="Jenis input" value={f.type} disabled={legacySpecKeys.includes(f.key)} onChange={type=>changeField(index,{type:type as SpecField["type"],min:undefined,max:undefined})} options={[{value:"text",label:"Teks"},{value:"number",label:"Angka"},{value:"select",label:"Dropdown"}]}/>
     <Input label="Satuan (opsional)" maxLength={20} value={f.unit} onChange={e=>changeField(index,{unit:e.target.value})}/>
     {f.type==="number"&&<><Input label="Nilai minimal (opsional)" type="number" value={f.min??""} onChange={e=>changeField(index,{min:e.target.value===""?undefined:Number(e.target.value)})}/><Input label="Nilai maksimal (opsional)" type="number" value={f.max??""} onChange={e=>changeField(index,{max:e.target.value===""?undefined:Number(e.target.value)})}/></>}
    </div>
    {f.type==="select"&&<label className="admin-field">Pilihan dropdown (satu per baris)<textarea rows={4} required value={f.options.join("\n")} onChange={e=>changeField(index,{options:e.target.value.split("\n")})}/></label>}
    <div className="category-config-toggles">{([["enabled","Aktif di form"],["required","Wajib diisi"],["showDetail","Tampilkan di detail"],["summary","Ringkasan harga"]] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={f[key]} onChange={e=>changeField(index,{[key]:e.target.checked})}/>{label}</label>)}</div>
    <div className="category-config-actions"><button type="button" className="outline-button" disabled={index===0} onClick={()=>move(index,-1)}>Naik</button><button type="button" className="outline-button" disabled={index===value.fields.length-1} onClick={()=>move(index,1)}>Turun</button><button type="button" className="outline-button" onClick={()=>patch("fields",value.fields.filter((_,i)=>i!==index))}>Hapus kolom</button></div>
   </details>)}
   <button type="button" className="outline-button" disabled={value.fields.length>=40} onClick={()=>{let n=1;while(value.fields.some(f=>f.key===`custom${n}`))n++;patch("fields",[...value.fields,{key:`custom${n}`,label:"Kolom baru",type:"text",unit:"",enabled:true,required:false,showDetail:true,summary:false,options:[]}]);}}>+ Tambah kolom spesifikasi</button>
  </section>
  <section className="category-config-section"><h3>Pilihan akses / kelengkapan</h3><p>Tambahkan setiap pilihan beserta ikonnya. Seret area card ke atas atau ke bawah untuk mengatur urutan checklist form aset dan detail publik.</p>
   <div className="sort-announcement" role="status" aria-live="polite">{facilitySort.announcement}</div>
   <div className={`facility-settings-list${facilitySort.drag?" is-sorting":""}`} ref={facilitySort.listRef}>{value.facilities.map((name,index)=><div className={`facility-settings-row${facilitySort.drag?.from===index?" is-dragging":""}`} data-sort-index={index} key={index} {...facilitySort.rowProps(index,name)}>
    <Input label={`Pilihan ${index+1}`} required maxLength={80} value={name} onChange={e=>updateFacility(index,e.target.value)} placeholder="Contoh: AC"/>
    <IconPicker disabled={!name.trim()} label={`Ikon ${name||`pilihan ${index+1}`}`} value={facilityIcon(name,value.facilityIcons)} onChange={icon=>patch("facilityIcons",{...value.facilityIcons,[name]:icon})}/>
    <div className="category-config-actions"><button type="button" className="outline-button" aria-label={`Hapus ${name}`} onClick={()=>removeFacility(index)}>Hapus</button></div>
   </div>)}</div>
   <button type="button" className="outline-button" disabled={value.facilities.length>=50} onClick={()=>patch("facilities",[...value.facilities,""])}>+ Tambah pilihan</button>
   <small className="facility-settings-count">{value.facilities.length} dari 50 pilihan</small>
  </section>
 </div>;
}
