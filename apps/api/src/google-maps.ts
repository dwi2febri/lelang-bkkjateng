export const googleMapsUrlPattern=/^https:\/\/(?:(?:www\.)?google\.(?:com|co\.id)\/maps(?:[/?#][^\s]*)?|maps\.google\.(?:com|co\.id)\/[^\s]*|maps\.app\.goo\.gl\/[A-Za-z0-9]+(?:\?[^\s]*)?|goo\.gl\/maps\/[A-Za-z0-9]+(?:\?[^\s]*)?)$/i;
export function isGoogleMapsUrl(value:string):boolean {
 if(value.length>2048||!googleMapsUrlPattern.test(value))return false;
 try{const url=new URL(value);return !url.username&&!url.password;}catch{return false;}
}
export function googleMapsSearchUrl(address:string):string {
 return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim()||"Indonesia")}`;
}
export type MapPoint={latitude:number;longitude:number};
export function isMapPoint(point:unknown):point is MapPoint {
 if(!point||typeof point!=="object")return false;
 const {latitude,longitude}=point as MapPoint;
 return typeof latitude==="number"&&Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&typeof longitude==="number"&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180;
}
export function pointGoogleMapsUrl(point:MapPoint):string {
 return googleMapsSearchUrl(`${point.latitude},${point.longitude}`);
}
