import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
const api=process.env.TEST_API_URL||'http://127.0.0.1:3001/api';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('log presence: admin-only, guest, submitted name, account, expiry and logout',async()=>{
 const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
 const suffix=randomBytes(8).toString('hex'), email=`presence-${suffix}@example.test`;
 const adminToken=randomBytes(32).toString('hex'),publicToken=randomBytes(32).toString('hex');
 let adminId,publicId,visitorHash;
 const headers={'Content-Type':'application/json','X-Requested-With':'BKKPublic','Origin':'http://localhost:3000'};
 let visitorCookie='';
 async function beat(kind='external',extra=''){
   const response=await fetch(api+'/presence',{method:'POST',headers:{...headers,Cookie:[visitorCookie,extra].filter(Boolean).join('; ')},body:JSON.stringify({kind,path:'/presence-test-'+suffix})});
   assert.equal(response.status,201,await response.clone().text());
   if(!visitorCookie){visitorCookie=response.headers.get('set-cookie').split(';')[0];visitorHash=hash(visitorCookie.split('=')[1]);}
 }
 async function log(type='external',extra={}){
   const response=await fetch(api+'/admin/user-logs?'+new URLSearchParams({type,q:suffix,...extra}),{headers:{Cookie:`bkk_admin_session=${adminToken}`}});
   assert.equal(response.status,200,await response.clone().text());return response.json();
 }
 try {
   const [a]=await db.execute('INSERT INTO admin_users(name,email,password_hash) VALUES(?,?,?)',['Presence admin '+suffix,email,'test-no-login']);adminId=a.insertId;
   const [p]=await db.execute('INSERT INTO public_users(name,email,phone,password_hash) VALUES(?,?,?,?)',['Presence account '+suffix,email,'081234567890','test-no-login']);publicId=p.insertId;
   await db.execute('INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))',[hash(adminToken),adminId]);
   await db.execute('INSERT INTO public_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR))',[hash(publicToken),publicId]);
   assert.equal((await fetch(api+'/admin/user-logs?type=external')).status,401);
   assert.equal((await fetch(api+'/admin/user-logs?type=external',{headers:{Cookie:`bkk_public_session=${publicToken}`}})).status,401);
   assert.equal((await fetch(api+'/presence',{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:JSON.stringify({kind:'external',path:'/'})})).status,403);
   assert.equal((await fetch(api+'/presence',{method:'POST',headers,body:JSON.stringify({kind:'internal',path:'/dashboard'})})).status,401);
   await beat();
   let result=await log();assert.equal(result.data.length,1);assert.equal(result.data[0].identity,'guest');assert.equal(result.data[0].name,result.data[0].ip);assert.equal(result.online,1);
   async function history(params={}) {
     const response=await fetch(api+'/admin/user-activity?'+new URLSearchParams({type:'external',q:suffix,...params}),{headers:{Cookie:`bkk_admin_session=${adminToken}`}});
     assert.equal(response.status,200);return response.json();
   }
   assert.equal((await fetch(api+'/admin/user-activity')).status,401);
   assert.equal((await history()).total,1);
   await beat();assert.equal((await history()).total,1,'Routine heartbeat does not duplicate history');
   const pageChange=await fetch(api+'/presence',{method:'POST',headers:{...headers,Cookie:visitorCookie},body:JSON.stringify({kind:'external',path:'/another-page-'+suffix})});
   assert.equal(pageChange.status,201);
   assert.equal((await history()).total,2,'Navigation appends history');
   assert.equal((await history()).data[0].path,'/another-page-'+suffix);
   const [[asset]]=await db.query('SELECT slug FROM assets WHERE archived=0 LIMIT 1');assert.ok(asset);
   const interest=await fetch(api+`/assets/${asset.slug}/interests`,{method:'POST',headers:{...headers,Cookie:visitorCookie},body:JSON.stringify({name:'Presence applicant '+suffix,email,phone:'081234567890',message:'Temporary test',consent:true})});
   assert.equal(interest.status,201,await interest.text());
   await beat();result=await log();assert.equal(result.data[0].identity,'applicant');assert.equal(result.data[0].name,'Presence applicant '+suffix);
   assert.equal((await history({action:'submission'})).total,1);
   await beat('external',`bkk_public_session=${publicToken}`);result=await log();assert.equal(result.data[0].identity,'account');assert.equal(result.data[0].name,'Presence account '+suffix);
   const events=await history();assert.equal(events.data[0].action,'session');assert.ok(events.data.some(row=>row.identity==='guest'),'Old guest identity is preserved in history');
   await db.execute('DELETE FROM public_sessions WHERE token_hash=?',[hash(publicToken)]);
   result=await log();assert.equal(result.online,0,'Logout stops account online status');
   await beat();result=await log();assert.equal(result.data[0].identity,'applicant');assert.equal(result.online,1);
   await db.execute('UPDATE user_presence SET last_seen=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 80 SECOND) WHERE visitor_hash=?',[visitorHash]);
   result=await log();assert.equal(result.online,0);assert.equal((await log('external',{status:'online'})).data.length,0);
   await beat('internal',`bkk_admin_session=${adminToken}`);result=await log('internal');assert.equal(result.online,1);assert.equal(result.data[0].name,'Presence admin '+suffix);
   await db.execute('DELETE FROM admin_sessions WHERE token_hash=?',[hash(adminToken)]);
   assert.equal((await fetch(api+'/admin/user-logs',{headers:{Cookie:`bkk_admin_session=${adminToken}`}})).status,401);
 } finally {
   if(visitorHash)await db.execute('DELETE FROM user_activity WHERE visitor_hash=?',[visitorHash]);
   if(visitorHash)await db.execute('DELETE FROM user_presence WHERE visitor_hash=?',[visitorHash]);
   await db.execute('DELETE FROM interests WHERE email=?',[email]);
   if(publicId)await db.execute('DELETE FROM public_users WHERE id=?',[publicId]);
   if(adminId)await db.execute('DELETE FROM admin_users WHERE id=?',[adminId]);
   await db.end();
 }
});
