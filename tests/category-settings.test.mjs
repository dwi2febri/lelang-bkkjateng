import test from "node:test";
import assert from "node:assert/strict";
import {defaultCategorySettings,validateCategorySettings,specValue,formatSpec,specificationIcon,facilityIcon,isIconName} from "../apps/api/src/category-settings.ts";
test("template kategori memisahkan kendaraan, tanah, rumah, dan industri",()=>{
 for(const name of ["Rumah","Ruko","Tanah","Kendaraan","Gudang","Lainnya"])validateCategorySettings(defaultCategorySettings(name));
 const car=defaultCategorySettings("Kendaraan");
 assert.ok(car.fields.some(f=>f.key==="mileage"));
 assert.ok(!car.fields.some(f=>["land","building","bedrooms"].includes(f.key)));
 assert.equal(car.sections.calculator,false);
 assert.equal(car.sections.financing,false);
 assert.ok(!defaultCategorySettings("Tanah").fields.some(f=>f.key==="building"));
 assert.ok(!defaultCategorySettings("Gudang").fields.some(f=>f.key==="bedrooms"));
 assert.ok(defaultCategorySettings("Gudang").fields.some(f=>f.key==="ceilingHeight"));
});
test("validasi konfigurasi menolak duplikasi kode, tipe salah, pilihan kosong dan batas terbalik",()=>{
 const config=defaultCategorySettings("Kendaraan");
 assert.throws(()=>validateCategorySettings({...config,fields:[config.fields[0],config.fields[0]]}));
 assert.throws(()=>validateCategorySettings({...config,fields:[{...config.fields[0],key:"__proto__"}]}));
 assert.throws(()=>validateCategorySettings({...config,fields:[{...config.fields[0],type:"select",options:[]}]}));
 assert.throws(()=>validateCategorySettings({...config,fields:[{...config.fields[0],type:"number",min:10,max:1}]}));
});
test("spesifikasi membaca data lama dan nilai tambahan tanpa mengarang nilai kosong",()=>{
 const asset={land:150,details:{bathrooms:2,attributes:{brand:"Toyota",mileage:0}}};
 assert.equal(specValue(asset,"land"),150);
 assert.equal(specValue(asset,"bathrooms"),2);
 assert.equal(specValue(asset,"brand"),"Toyota");
 assert.equal(formatSpec(specValue(asset,"mileage"),"km"),"0 km");
 assert.equal(formatSpec(specValue(asset,"manufactureYear"),""),"Belum tersedia");
});
test("ikon spesifikasi dan kelengkapan menerima koleksi API serta menolak URL atau format tidak valid",()=>{
 const config=defaultCategorySettings("Kendaraan");
 config.fields[0].icon="mdi:car-sports";
 config.facilityIcons={AC:"tabler:air-conditioning","Kamera mundur":"mdi:camera-outline"};
 validateCategorySettings(config);
 assert.equal(specificationIcon("brand",config.fields[0].icon),"mdi:car-sports");
 assert.equal(facilityIcon("AC",config.facilityIcons),"tabler:air-conditioning");
 assert.equal(facilityIcon("AC"),"lucide:snowflake");
 assert.equal(specificationIcon("land"),"lucide:ruler");
 for(const value of ["https://example.com/x.svg","javascript:alert(1)","mdi:../car","<svg/>",""])assert.equal(isIconName(value),false);
 assert.throws(()=>validateCategorySettings({...config,facilityIcons:{AC:"https://example.com/x.svg"}}));
 assert.throws(()=>validateCategorySettings({...config,facilityIcons:{Unknown:"mdi:car"}}));
 assert.throws(()=>validateCategorySettings({...config,fields:[{...config.fields[0],icon:"bad"}]}));
});
