import test from "node:test";
import assert from "node:assert/strict";
import {dragSortTarget} from "../apps/web/src/components/ui/drag-sort-position.ts";
test("card kedua bisa menjadi pertama tepat pada batas atas",()=>{
 const rows=[{top:0,height:100},{top:112,height:100},{top:224,height:100}];
 assert.equal(dragSortTarget(rows,1,-112),0);
 assert.equal(dragSortTarget(rows,1,-70),0);
 assert.equal(dragSortTarget(rows,1,-20),1);
 assert.equal(dragSortTarget(rows,0,224),2);
 assert.equal(dragSortTarget(rows,2,-224),0);
});
test("tujuan drag benar untuk card berbeda tinggi dan ukuran pecahan",()=>{
 const rows=[{top:0,height:80.5},{top:92.5,height:140},{top:244.5,height:100}];
 assert.equal(dragSortTarget(rows,1,-92.5),0);
 assert.equal(dragSortTarget(rows,0,264),2);
 assert.equal(dragSortTarget(rows,2,-244.5),0);
 assert.equal(dragSortTarget(rows,1,0),1);
});
