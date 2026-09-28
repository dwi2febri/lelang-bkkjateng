import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAssets} from '../apps/web/src/features/aset/summary.ts';
test('ringkasan menghitung nominal numerik dan jumlah setiap metode tanpa penghitungan ganda',()=>{
 const rows=[{saleMethod:'Jual Beli',price:'120000000'},{saleMethod:'Cessie',price:80000000},{saleMethod:'Lelang',price:450000000},{saleMethod:'Jual Beli',price:200000000}];
 assert.deepEqual(summarizeAssets(rows).map(({label,count,total})=>[label,count,total]),[['All',4,850000000],['Jual Beli',2,320000000],['Cessie',1,80000000],['Lelang',1,450000000]]);
 assert.ok(summarizeAssets([]).every(item=>item.count===0&&item.total===0));
});
