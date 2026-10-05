import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const base=process.env.TEST_API_URL||'http://127.0.0.1:3001/api';

test('Recycle Bin: otorisasi, hapus/pulihkan, relasi dan larangan menghapus master terpakai',async t=>{
  const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
  const suffix=randomBytes(5).toString('hex'),adminToken=randomBytes(32).toString('hex'),publicToken=randomBytes(32).toString('hex');
  const category='Recycle-'+suffix,slug='recycle-'+suffix;
  const ids={};
  const headers={'Content-Type':'application/json','X-Requested-With':'BKKAdmin',Origin:'http://localhost:3000',Cookie:`bkk_admin_session=${adminToken}`};
  const publicHeaders={...headers,'X-Requested-With':'BKKPublic',Cookie:`bkk_public_session=${publicToken}`};
  const request=(path,method='GET',body,auth=headers)=>fetch(base+path,{method,headers:auth,body:body===undefined?undefined:JSON.stringify(body)});
  const json=async(path,auth=headers)=>{const r=await request(path,'GET',undefined,auth);assert.equal(r.status,200,await r.clone().text());return r.json();};
  const expectStatus=async(path,method,status,body)=>{const r=await request(path,method,body);assert.equal(r.status,status,await r.clone().text());return r;};
  try {
    const [admin]=await db.execute('INSERT INTO admin_users(name,email,password_hash) VALUES(?,?,?)',['Recycle test',`${suffix}@admin.example.test`,'unused']);ids.admin=admin.insertId;
    const [user]=await db.execute('INSERT INTO public_users(name,email,phone,password_hash) VALUES(?,?,?,?)',['Recycle applicant',`${suffix}@example.test`,'081234567890','unused']);ids.user=user.insertId;
    for(const [table,token,id] of [['admin_sessions',adminToken,ids.admin],['public_sessions',publicToken,ids.user]])await db.execute(`INSERT INTO ${table}(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))`,[createHash('sha256').update(token).digest('hex'),id]);
    await db.execute('INSERT INTO asset_categories(name,label,icon) VALUES(?,?,?)',[category,'Kategori uji Recycle Bin','car']);
    const [product]=await db.execute('INSERT INTO credit_products(code,name,rules) VALUES(?,?,?)',[slug,'Produk uji Recycle Bin',JSON.stringify([{audience:'all',minMonths:1,maxMonths:null,flatRate:9,annuityRate:null}])]);ids.product=product.insertId;
    const [asset]=await db.execute("INSERT INTO assets(slug,code,title,category,city,address,price,land,building,image,certificate,description,creditProductId,saleMethod) VALUES(?,?,?,?,?,?,100000000,0,0,?,'BPKB','Aset uji Recycle Bin',?,'Jual Beli')",[slug,'REC-'+suffix.toUpperCase(),'Aset uji '+suffix,category,'Semarang','Alamat uji','https://example.com/recycle.jpg',ids.product]);ids.asset=asset.insertId;
    const [interest]=await db.execute("INSERT INTO interests(asset_id,name,email,phone,message,consent,public_user_id,status) VALUES(?,?,?,?,?,1,?,'diproses')",[ids.asset,'Recycle applicant',`${suffix}@example.test`,'081234567890','Pesan uji',ids.user]);ids.interest=interest.insertId;
    await db.execute('INSERT INTO interest_history(interest_id,admin_id,status,notes) VALUES(?,?,?,?)',[ids.interest,ids.admin,'diproses','Riwayat tetap tersimpan']);
    await db.execute("INSERT INTO interest_messages(interest_id,sender_role,admin_id,body) VALUES(?,'admin',?,'Percakapan tetap tersimpan')",[ids.interest,ids.admin]);
    await db.execute('INSERT INTO public_favorites(user_id,asset_id) VALUES(?,?)',[ids.user,ids.asset]);

    await t.test('endpoint hapus/pulihkan hanya untuk admin dan memeriksa origin',async()=>{
      for(const [path,method] of [['/admin/recycle-bin','GET'],[`/admin/assets/${ids.asset}`,'DELETE'],[`/admin/pengajuan/${ids.interest}`,'DELETE'],[`/admin/categories/${category}`,'DELETE'],[`/admin/credit-products/${ids.product}`,'DELETE'],[`/admin/recycle-bin/assets/${ids.asset}/restore`,'PATCH'],[`/admin/recycle-bin/pengajuan/${ids.interest}/restore`,'PATCH']]){
        assert.equal((await request(path,method,undefined,{})).status,401);
        assert.equal((await request(path,method,undefined,publicHeaders)).status,401);
      }
      assert.equal((await request(`/admin/assets/${ids.asset}`,'DELETE',undefined,{...headers,Origin:'https://untrusted.example'})).status,403);
    });
    await t.test('aset hilang dari daftar, katalog, favorit, history publik dan chat; data tetap utuh',async()=>{
      assert.equal((await json(`/public-account/history`,publicHeaders)).some(i=>i.id===ids.interest),true);
      await expectStatus(`/admin/assets/${ids.asset}`,'DELETE',200);
      await expectStatus(`/admin/assets/${ids.asset}`,'DELETE',404);
      assert.equal((await json('/admin/assets')).data.some(a=>a.id===ids.asset),false);
      assert.equal((await json('/assets?q='+slug)).total,0);
      await expectStatus(`/assets/${slug}`,'GET',404);
      await expectStatus(`/admin/assets/${ids.asset}`,'GET',404);
      assert.equal((await json('/public-account/favorites',publicHeaders)).includes(ids.asset),false);
      assert.equal((await json('/public-account/history',publicHeaders)).some(i=>i.id===ids.interest),false);
      assert.equal((await request(`/public-account/history/${ids.interest}/messages`,'GET',undefined,publicHeaders)).status,404);
      await expectStatus(`/admin/pengajuan/${ids.interest}/messages`,'POST',404,{body:'Tidak boleh terkirim'});
      assert.ok((await json(`/admin/pengajuan/${ids.interest}`)).asset_deleted_at,'Admin retains the associated submission');
      assert.ok((await json('/admin/recycle-bin')).assets.some(a=>a.id===ids.asset));
      const [[count]]=await db.execute('SELECT COUNT(*) total FROM interest_messages WHERE interest_id=?',[ids.interest]);assert.equal(count.total,1);
    });
    await t.test('kategori termasuk aset terhapus dilindungi; produk tetap dilindungi setelah dilepas',async()=>{
      const c=(await json('/admin/categories')).find(c=>c.name===category);assert.equal(c.assetCount,1);
      await expectStatus(`/admin/categories/${category}`,'DELETE',409);
      await expectStatus(`/admin/credit-products/${ids.product}`,'DELETE',409);
      await db.execute('UPDATE assets SET creditProductId=NULL WHERE id=?',[ids.asset]);
      await expectStatus(`/admin/credit-products/${ids.product}`,'DELETE',409);
      assert.ok((await json('/admin/credit-products')).find(p=>p.id===ids.product).used_at);
    });
    await t.test('pengajuan pulih setelah aset dipulihkan; riwayat dan chat kembali',async()=>{
      await expectStatus(`/admin/pengajuan/${ids.interest}`,'DELETE',200);
      assert.equal((await json('/admin/pengajuan?q='+suffix)).total,0);
      await expectStatus(`/admin/pengajuan/${ids.interest}`,'GET',404);
      await expectStatus(`/admin/pengajuan/${ids.interest}/status`,'PATCH',409,{status:'selesai',notes:'Tidak boleh berubah',version:1});
      assert.ok((await json('/admin/recycle-bin')).interests.some(i=>i.id===ids.interest));
      await expectStatus(`/admin/recycle-bin/pengajuan/${ids.interest}/restore`,'PATCH',409);
      await expectStatus(`/admin/recycle-bin/assets/${ids.asset}/restore`,'PATCH',200);
      assert.equal((await json('/public-account/history',publicHeaders)).some(i=>i.id===ids.interest),false,'Restoring parent does not restore an independently deleted interest');
      await expectStatus(`/admin/recycle-bin/pengajuan/${ids.interest}/restore`,'PATCH',200);
      const history=(await json('/public-account/history',publicHeaders)).find(i=>i.id===ids.interest);assert.equal(history.status,'diproses');assert.equal(history.statusHistory.length,1);
      const chat=await json(`/public-account/history/${ids.interest}/messages`,publicHeaders);assert.equal(chat.messages[0].body,'Percakapan tetap tersimpan');
      assert.equal((await json('/public-account/favorites',publicHeaders)).includes(ids.asset),true);
      assert.equal((await json('/assets/'+slug)).id,ids.asset);
      await expectStatus(`/admin/recycle-bin/assets/${ids.asset}/restore`,'PATCH',404);
      await expectStatus(`/admin/assets/${ids.asset}/archive`,'PATCH',200,{archived:true});
      await expectStatus(`/admin/assets/${ids.asset}`,'DELETE',200);
      await expectStatus(`/admin/recycle-bin/assets/${ids.asset}/restore`,'PATCH',200);
      assert.equal((await json(`/admin/assets/${ids.asset}`)).archived,1);
      await expectStatus('/assets/'+slug,'GET',404);
    });
    await t.test('master yang belum dipakai boleh dihapus; penugasan produk baru dicatat',async()=>{
      const unusedCategory=category+'-X';await db.execute('INSERT INTO asset_categories(name,label,icon) VALUES(?,?,?)',[unusedCategory,'Kategori kosong','car']);
      try{await expectStatus('/admin/categories/'+unusedCategory,'DELETE',200);}finally{await db.execute('DELETE FROM asset_categories WHERE name=?',[unusedCategory]);}
      const [unused]=await db.execute('INSERT INTO credit_products(code,name,rules) VALUES(?,?,?)',[slug+'-empty','Produk kosong','[]']);
      try{await expectStatus('/admin/credit-products/'+unused.insertId,'DELETE',200);}finally{await db.execute('DELETE FROM credit_products WHERE id=?',[unused.insertId]);}
      const [assigned]=await db.execute('INSERT INTO credit_products(code,name,rules) VALUES(?,?,?)',[slug+'-assigned','Produk pernah dipakai','[]']);
      try{
        await db.execute('UPDATE assets SET creditProductId=? WHERE id=?',[assigned.insertId,ids.asset]);
        await db.execute('UPDATE assets SET creditProductId=NULL WHERE id=?',[ids.asset]);
        await expectStatus('/admin/credit-products/'+assigned.insertId,'DELETE',409);
      }finally{await db.execute('UPDATE assets SET creditProductId=NULL WHERE id=?',[ids.asset]);await db.execute('DELETE FROM credit_products WHERE id=?',[assigned.insertId]);}
    });
  }finally{
    if(ids.interest)await db.execute('DELETE FROM interests WHERE id=?',[ids.interest]);
    if(ids.user)await db.execute('DELETE FROM public_users WHERE id=?',[ids.user]);
    if(ids.asset){await db.execute('DELETE FROM asset_photos WHERE asset_id=?',[ids.asset]);await db.execute('DELETE FROM assets WHERE id=?',[ids.asset]);}
    if(ids.product)await db.execute('DELETE FROM credit_products WHERE id=?',[ids.product]);
    await db.execute('DELETE FROM asset_categories WHERE name=?',[category]);
    if(ids.admin)await db.execute('DELETE FROM admin_users WHERE id=?',[ids.admin]);
    await db.end();
  }
});
