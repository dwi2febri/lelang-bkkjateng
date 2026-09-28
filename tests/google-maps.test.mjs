import test from "node:test";
import assert from "node:assert/strict";
import {isGoogleMapsUrl,googleMapsSearchUrl,isMapPoint,pointGoogleMapsUrl} from "../apps/api/src/google-maps.ts";
test("tautan lokasi menerima Google Maps panjang dan tautan Bagikan",()=>{
 for(const url of ["https://maps.app.goo.gl/Abc123?g_st=ic","https://www.google.com/maps/place/Semarang/","https://maps.google.com/?q=-6.98,110.42","https://goo.gl/maps/Abc123","https://www.google.co.id/maps/search/?api=1&query=Semarang"])assert.equal(isGoogleMapsUrl(url),true,url);
 for(const url of ["https://example.com/maps","https://www.google.com.evil.test/maps","https://www.google.com/maps@evil.test","https://evil@www.google.com/maps/","javascript:alert(1)","http://maps.app.goo.gl/Abc123",""])assert.equal(isGoogleMapsUrl(url),false,url);
});
test("koordinat pin tervalidasi dan tautan menunjuk koordinat tepat",()=>{
 for(const point of [{latitude:0,longitude:0},{latitude:-6.99,longitude:110.42},{latitude:-90,longitude:180}]){
  assert.equal(isMapPoint(point),true);
  assert.equal(new URL(pointGoogleMapsUrl(point)).searchParams.get("query"),`${point.latitude},${point.longitude}`);
 }
 for(const point of [null,{}, {latitude:10}, {latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:NaN,longitude:0},{latitude:"1",longitude:2}])assert.equal(isMapPoint(point),false);
});
test("pencarian lokasi menyandikan alamat dan wilayah dalam query",()=>{
 const address="Jl. A & B, Semarang, Jawa Tengah";
 const url=new URL(googleMapsSearchUrl(address));
 assert.equal(url.searchParams.get("api"),"1");
 assert.equal(url.searchParams.get("query"),address);
 assert.equal(isGoogleMapsUrl(url.href),true);
});
