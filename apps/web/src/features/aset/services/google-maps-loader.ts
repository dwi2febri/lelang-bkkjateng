import {importLibrary,setOptions} from "@googlemaps/js-api-loader";

let configured=false;
let authenticationFailed=false;
const errorListeners=new Set<()=>void>();
export function onMapsAuthenticationError(listener:()=>void) {
 errorListeners.add(listener);
 if(authenticationFailed)listener();
 return ()=>{errorListeners.delete(listener);};
}
export async function loadGoogleMaps() {
 const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
 if(!key)throw new Error("Google Maps belum dikonfigurasi.");
 if(!configured){
  configured=true;
  const target=window as Window&{gm_authFailure?:()=>void};
  const previous=target.gm_authFailure;
  target.gm_authFailure=()=>{authenticationFailed=true;errorListeners.forEach(listener=>listener());previous?.();};
  setOptions({key,v:"weekly",language:"id",region:"ID"});
 }
 if(authenticationFailed)throw new Error("Google Maps menolak akses. Periksa API key dan izin domain aplikasi.");
 const [maps,markers]=await Promise.all([importLibrary("maps"),importLibrary("marker")]);
 return {maps,markers};
}
export async function findMapAddress(address:string) {
 await loadGoogleMaps();
 const {Place}=await importLibrary("places");
 const {places}=await Place.searchByText({textQuery:address,fields:["location","viewport"],region:"id",language:"id",maxResultCount:1});
 return places[0];
}
