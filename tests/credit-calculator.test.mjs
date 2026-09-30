import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creditTerms,creditCalculation} from '../apps/web/src/features/credit-products/calculator.ts';
const seeds=JSON.parse(readFileSync(new URL('../scripts/data/credit-products.json',import.meta.url),'utf8'));
const product=code=>seeds.find(row=>row.code===code);
test('produk referensi: bunga dan peralihan tenor 36/37 dan 60/61',()=>{
 for(const code of ['mikro','agrari']) {
  assert.equal(creditTerms(product(code),36,'flat').rate,9);
  assert.equal(creditTerms(product(code),37,'flat').rate,11);
  assert.equal(creditTerms(product(code),36,'anuitas').rate,15);
  assert.equal(creditTerms(product(code),37,'anuitas').rate,18);
 }
 assert.equal(creditTerms(product('joglo'),36,'flat').rate,10.5);
 assert.equal(creditTerms(product('joglo'),37,'flat').rate,12);
 assert.equal(creditTerms(product('joglo'),60,'anuitas').rate,20);
 assert.equal(creditTerms(product('joglo'),61,'flat').method,'anuitas');
 assert.equal(creditTerms(product('joglo'),61,'flat').rate,21);
 assert.equal(creditTerms(product('migunani'),36,'flat').rate,13);
 assert.equal(creditTerms(product('migunani'),37,'flat').rate,15);
 assert.equal(creditTerms(product('migunani'),36,'anuitas').rate,20);
 assert.equal(creditTerms(product('migunani'),37,'anuitas').rate,21);
 const makaryo=product('makaryo');
 for(const months of [36,60,61,120]) {const terms=creditTerms(makaryo,months,'anuitas','internal');assert.equal(terms.method,'flat');assert.equal(terms.rate,6);}
 assert.equal(creditTerms(makaryo,60,'flat','external').rate,9);
 assert.equal(creditTerms(makaryo,60,'anuitas','external').rate,15);
 assert.equal(creditTerms(makaryo,61,'flat','external').method,'anuitas');
 assert.equal(creditTerms(makaryo,61,'flat','external').rate,16);
});
test('angsuran flat/anuitas dan sisa pokok mengikuti rumus referensi',()=>{
 const flat=creditCalculation(100000000,60,11,'flat');
 assert.ok(Math.abs(flat.payment-2583333.3333333335)<.001);
 assert.ok(Math.abs(flat.totalInterest-55000000)<.001);
 const ann=creditCalculation(100000000,60,18,'anuitas');
 const r=18/1200,expected=100000000*(r*Math.pow(1+r,60))/(Math.pow(1+r,60)-1);
 assert.ok(Math.abs(ann.payment-expected)<.001);
 for(const result of [flat,ann,creditCalculation(100000000,60,0,'anuitas')]) {
  assert.equal(result.schedule.length,60);assert.equal(result.schedule.at(-1).balance,0);
  assert.ok(Math.abs(result.schedule.reduce((sum,row)=>sum+row.capital,0)-100000000)<.001);
  assert.ok(Math.abs(result.totalPayment-result.totalInterest-100000000)<.001);
 }
 assert.equal(creditCalculation(0,60,9,'flat'),null);
 assert.equal(creditCalculation(1e8,0,9,'flat'),null);
 assert.equal(creditCalculation(1e8,3.5,9,'flat'),null);
 assert.equal(creditTerms(product('mikro'),0,'flat'),null);
});
