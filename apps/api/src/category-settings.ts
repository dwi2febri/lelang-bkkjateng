// Shared, framework-independent category schema used by the API and web editor.
export type SpecField = {
  key: string; label: string; type: "text" | "number" | "select";
  unit: string; enabled: boolean; required: boolean; showDetail: boolean;
  summary: boolean; options: string[]; min?: number; max?: number; icon?: string;
};
export type CategorySettings = {
  template: string; descriptionLabel: string; descriptionHint: string;
  specsLabel: string; certificateLabel: string; certificateHint: string;
  facilitiesLabel: string; contactLabel: string; financingLabel: string;
  sections: { description: boolean; specs: boolean; location: boolean; facilities: boolean; scheme: boolean; calculator: boolean; financing: boolean };
  fields: SpecField[]; facilities: string[]; facilityIcons?: Record<string,string>;
};
export const iconNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isIconName(value: unknown): value is string { return typeof value === "string" && value.length <= 160 && iconNamePattern.test(value); }
export function specificationIcon(key: string, icon?: string): string {
  if (icon && isIconName(icon)) return icon;
  const names:Record<string,string>={land:"ruler",building:"building-2",bedrooms:"bed-double",bathrooms:"shower-head",floors:"layers",electricity:"zap",carport:"square-parking",yearBuilt:"calendar-days",brand:"badge",model:"car-front",manufactureYear:"calendar-days",mileage:"gauge",transmission:"cog",fuel:"fuel",engineCapacity:"cog",color:"palette",condition:"clipboard-check",taxUntil:"calendar-check",landUse:"land-plot",landContour:"mountain",roadWidth:"route",frontWidth:"ruler",ceilingHeight:"arrow-up-down",floorCapacity:"weight",industrialUse:"factory",businessUse:"store"};
  return `lucide:${names[key]||"file-text"}`;
}
export function facilityIcon(name:string, icons?:Record<string,string>):string {
  const custom=icons?.[name];
  if(custom&&isIconName(custom))return custom;
  const names:Record<string,string>={"AC":"snowflake","Airbag":"shield-check","ABS":"circle-parking","Kamera mundur":"camera","Sensor parkir":"radar","Buku servis":"book-open","Kunci cadangan":"key-round","Ban cadangan":"circle","Bandara":"plane","Bank/ATM":"landmark","Bioskop":"film","Farmasi":"pill","Furnished":"sofa","Garasi":"warehouse","Gym":"dumbbell","Halte":"bus","Jalan Tol":"route","Keamanan":"shield-check","Kolam renang":"waves","Lift":"arrow-up-down","Mall":"shopping-cart","Parkir/Carport":"square-parking","Pasar":"store","Restoran":"utensils","Rumah Ibadah":"church","Rumah Sakit":"hospital","Sambungan telepon":"phone","Sekolah":"school","SPBU":"fuel","Stasiun":"train-front","Taman":"trees","Akses truk":"truck","Loading dock":"container","Listrik 3 fase":"zap","Hydrant":"flame","Kantor":"building-2","Area parkir":"square-parking","Sumber air":"droplets"};
  return `lucide:${names[name]||"circle-check"}`;
}
export const templateLabels: Record<string, string> = { house: "Rumah / hunian", commercial: "Ruko / ruang usaha", land: "Tanah", vehicle: "Kendaraan", industrial: "Gudang / pabrik", general: "Aset lainnya" };
export const legacySpecKeys = ["land", "building", "bedrooms", "bathrooms", "floors", "electricity", "carport", "yearBuilt"];
const propertyFacilities = ["Bandara", "Bank/ATM", "Bioskop", "Farmasi", "Furnished", "Garasi", "Gym", "Halte", "Jalan Tol", "Keamanan", "Kolam renang", "Lift", "Mall", "Parkir/Carport", "Pasar", "Restoran", "Rumah Ibadah", "Rumah Sakit", "Sambungan telepon", "Sekolah", "SPBU", "Stasiun", "Taman"];
function field(key: string, label: string, type: SpecField["type"] = "number", unit = "", summary = false, options: string[] = []): SpecField {
  return { key, label, type, unit, summary, options, enabled: true, required: false, showDetail: true, ...(type === "number" ? { min: key === "yearBuilt" ? 1800 : 0, max: ["bedrooms","bathrooms","floors","carport"].includes(key) ? 1000 : key === "yearBuilt" ? 2200 : key === "electricity" ? 1000000 : 10000000 } : {}) };
}
export function defaultCategorySettings(name: string, template?: string): CategorySettings {
  const kind = template || ({ Rumah: "house", Ruko: "commercial", Tanah: "land", Kendaraan: "vehicle", Gudang: "industrial" }[name] ?? "general");
  const property = [field("land", "Luas tanah", "number", "m²", true), field("building", "Luas bangunan", "number", "m²", true)];
  const building = [field("bathrooms", "Kamar mandi"), field("floors", "Jumlah lantai"), field("electricity", "Daya listrik", "number", "VA"), field("carport", "Kapasitas parkir", "number", "mobil"), field("yearBuilt", "Tahun dibangun")];
  let fields: SpecField[] = [];
  if (kind === "house") fields = [...property, field("bedrooms", "Kamar tidur"), ...building];
  if (kind === "commercial") fields = [...property, ...building, field("businessUse", "Peruntukan usaha", "text")];
  if (kind === "land") fields = [property[0], field("landUse", "Peruntukan lahan", "text"), field("landContour", "Kontur tanah", "select", "", false, ["Datar", "Miring", "Bervariasi"]), field("roadWidth", "Lebar akses jalan", "number", "m"), field("frontWidth", "Lebar muka tanah", "number", "m")];
  if (kind === "vehicle") fields = [field("brand", "Merek", "text", "", true), field("model", "Model / tipe", "text"), field("manufactureYear", "Tahun produksi", "number", "", true), field("mileage", "Jarak tempuh", "number", "km"), field("transmission", "Transmisi", "select", "", false, ["Manual", "Otomatis"]), field("fuel", "Bahan bakar", "select", "", false, ["Bensin", "Diesel", "Listrik", "Hybrid"]), field("engineCapacity", "Kapasitas mesin", "number", "cc"), field("color", "Warna", "text"), field("condition", "Kondisi", "text"), field("taxUntil", "Masa berlaku pajak", "text")];
  if (kind === "industrial") fields = [...property, ...building.filter(f => f.key !== "carport"), field("ceilingHeight", "Tinggi bangunan", "number", "m"), field("floorCapacity", "Kapasitas beban lantai", "number", "kg/m²"), field("roadWidth", "Lebar akses truk", "number", "m"), field("industrialUse", "Peruntukan industri", "text")];
  return { template: kind, descriptionLabel: kind === "vehicle" ? "Deskripsi kendaraan" : kind === "land" ? "Deskripsi tanah" : kind === "industrial" ? "Deskripsi gudang / pabrik" : "Deskripsi aset", descriptionHint: kind === "vehicle" ? "Jelaskan kondisi kendaraan, riwayat servis, dan kelengkapan dokumen." : kind === "land" ? "Jelaskan kondisi, akses, batas, dan peruntukan lahan." : "Jelaskan kondisi aset, keunggulan, dan informasi penting bagi calon pembeli.", specsLabel: "Spesifikasi " + (kind === "vehicle" ? "kendaraan" : kind === "land" ? "tanah" : "aset"), certificateLabel: kind === "vehicle" ? "Dokumen kendaraan" : "Dokumen kepemilikan", certificateHint: kind === "vehicle" ? "BPKB / STNK" : "SHM / SHGB / dokumen lain", facilitiesLabel: kind === "vehicle" ? "Kelengkapan kendaraan" : "Akses & fasilitas", contactLabel: "Hubungi Kami", financingLabel: "Ajukan BKK Joglo", sections: {description:true,specs:true,location:true,facilities:true,scheme:true,calculator:["house","commercial","land"].includes(kind),financing:["house","commercial","land"].includes(kind)}, fields, facilities: kind === "vehicle" ? ["AC", "Airbag", "ABS", "Kamera mundur", "Sensor parkir", "Buku servis", "Kunci cadangan", "Ban cadangan"] : kind === "industrial" ? ["Akses truk", "Loading dock", "Listrik 3 fase", "Hydrant", "Keamanan", "Kantor", "Area parkir", "Sumber air"] : kind === "general" ? [] : propertyFacilities };
}
export function getCategorySettings(name: string, settings?: CategorySettings | null): CategorySettings {
  return settings || defaultCategorySettings(name);
}
export function validateCategorySettings(value: unknown): asserts value is CategorySettings {
  const fail = () => { throw new Error("Pengaturan kategori tidak valid. Periksa kolom, pilihan, dan batas nilainya."); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const s = value as CategorySettings;
  if (!Object.hasOwn(templateLabels, s.template)) fail();
  for (const key of ["descriptionLabel","descriptionHint","specsLabel","certificateLabel","certificateHint","facilitiesLabel","contactLabel","financingLabel"] as const)
    if (typeof s[key] !== "string" || !s[key].trim() || s[key].length > 300) fail();
  if (!s.sections || ["description","specs","location","facilities","scheme","calculator","financing"].some(k => typeof (s.sections as Record<string, unknown>)[k] !== "boolean")) fail();
  if (!Array.isArray(s.facilities) || s.facilities.length > 50 || s.facilities.some(v => typeof v !== "string" || !v.trim() || v.length > 80) || new Set(s.facilities).size !== s.facilities.length) fail();
  if (s.facilityIcons !== undefined && (!s.facilityIcons || typeof s.facilityIcons !== "object" || Array.isArray(s.facilityIcons) || Object.keys(s.facilityIcons).length>50 || Object.entries(s.facilityIcons).some(([name,icon])=>!s.facilities.includes(name)||!isIconName(icon)))) fail();
  if (!Array.isArray(s.fields) || s.fields.length > 40) return fail();
  const keys = new Set<string>();
  for (const f of s.fields) {
    if(f.icon !== undefined && !isIconName(f.icon)) fail();
    if (!f || !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(f.key) || ["constructor","prototype","__proto__"].includes(f.key) || keys.has(f.key)) fail();
    keys.add(f.key);
    if (typeof f.label !== "string" || !f.label.trim() || f.label.length > 80 || typeof f.unit !== "string" || f.unit.length > 20 || !["text","number","select"].includes(f.type)) fail();
    if ([f.enabled,f.required,f.showDetail,f.summary].some(v => typeof v !== "boolean")) fail();
    if (!Array.isArray(f.options) || f.options.length > 50 || f.options.some(v => typeof v !== "string" || !v.trim() || v.length > 100) || (f.type === "select" && !f.options.length)) fail();
    if (legacySpecKeys.includes(f.key) && f.type !== "number") fail();
    for (const n of [f.min,f.max]) if (n !== undefined && (!Number.isFinite(n) || Math.abs(n) > 1e12)) fail();
    if (f.min !== undefined && f.max !== undefined && f.min > f.max) fail();
  }
}
export function specValue(asset: {land?:number;building?:number;bedrooms?:number;details?:Record<string,unknown>}, key: string): unknown {
  if (["land","building","bedrooms"].includes(key)) return asset[key as "land" | "building" | "bedrooms"];
  if (legacySpecKeys.includes(key)) return asset.details?.[key];
  return (asset.details?.attributes as Record<string,unknown> | undefined)?.[key];
}
export function formatSpec(value: unknown, unit: string): string {
  return value === undefined || value === null || value === "" ? "Belum tersedia" : `${value}${unit ? ` ${unit}` : ""}`;
}
