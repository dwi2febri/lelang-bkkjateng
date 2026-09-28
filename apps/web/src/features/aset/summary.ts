import type {Asset} from "./types";

export function summarizeAssets(assets:Pick<Asset,"price"|"saleMethod">[]) {
 const summary=["", "Jual Beli", "Cessie", "Lelang"].map(method=>({method,label:method||"All",count:0,total:0}));
 for(const asset of assets){
  const price=Number(asset.price);
  for(const group of summary){
   if(!group.method||group.method===asset.saleMethod){group.count++;group.total+=Number.isFinite(price)?price:0;}
  }
 }
 return summary;
}
