import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesAsset} from '../apps/web/src/features/aset/filters.ts';
const filters={q:'',status:'active',category:'',saleMethod:'',province:'',city:'',minPrice:'',maxPrice:''};
const asset={title:'Rumah Uji',code:'BKK-UJI',category:'Rumah',saleMethod:'Lelang',province:'Jawa Tengah',city:'Semarang',price:500000000,archived:0};
test('filter aset: kombinasi kategori, metode, wilayah dan batas harga inklusif',()=>{
 assert.equal(matchesAsset(asset,{...filters,category:'Rumah',saleMethod:'Lelang',province:'Jawa Tengah',city:'Semarang',minPrice:'500000000',maxPrice:'500000000'}),true);
 for(const diff of [{category:'Tanah'},{saleMethod:'Cessie'},{province:'Jawa Barat'},{city:'Kendal'},{minPrice:'500000001'},{maxPrice:'499999999'},{status:'archived'},{q:'tidak ditemukan'}]) assert.equal(matchesAsset(asset,{...filters,...diff}),false,JSON.stringify(diff));
 assert.equal(matchesAsset(asset,{...filters,q:' jawa tengah '}),true);
 assert.equal(matchesAsset({...asset,province:null},filters),true);
 assert.equal(matchesAsset({...asset,province:null},{...filters,province:'Jawa Tengah'}),false);
 assert.equal(matchesAsset({...asset,archived:1},{...filters,status:'all'}),true);
 assert.equal(matchesAsset({...asset,city:'Semarang'},{...filters,city:'Kota Semarang'}),true);
 assert.equal(matchesAsset({...asset,province:'DKI Jakarta'},{...filters,province:'Daerah Khusus Ibukota Jakarta'}),true);
});
