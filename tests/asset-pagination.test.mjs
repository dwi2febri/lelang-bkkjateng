import test from 'node:test';
import assert from 'node:assert/strict';
import {assetPage} from '../apps/web/src/features/aset/pagination.ts';
const assets = Array.from({length:30},(_,index)=>({id:index+1}));

test('pagination divides assets without duplication or missing rows',()=>{
 const pages=[1,2,3].map(page=>assetPage(assets,page,'10'));
 assert.deepEqual(pages.flatMap(page=>page.rows),assets);
 assert.deepEqual(pages.map(({from,to})=>[from,to]),[[1,10],[11,20],[21,30]]);
 assert.equal(assetPage(assets,2,'25').rows.length,5);
});
test('all mode shows all filtered assets, including after changing page size',()=>{
 const filtered=assets.filter(asset=>asset.id%2===0);
 const result=assetPage(filtered,3,'all');
 assert.deepEqual(result.rows,filtered);
 assert.equal(result.page,1);
 assert.equal(result.pages,1);
 assert.equal(result.to,15);
});
test('last page remains valid after archiving and empty filters have an empty range',()=>{
 const result=assetPage(assets.slice(0,20),3,'10');
 assert.equal(result.page,2);
 assert.equal(result.rows[0].id,11);
 for(const size of ['10','all']) {
  const empty=assetPage([],3,size);
  assert.equal(empty.page,1);
  assert.equal(empty.from,0);
  assert.equal(empty.to,0);
  assert.deepEqual(empty.rows,[]);
 }
});
