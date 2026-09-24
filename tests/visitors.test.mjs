import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({quiet:true});
test('pengunjung unik tidak bertambah karena refresh atau request bersamaan', async () => {
  const db = await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'lelang_bkkjateng'});
  const visitorId=randomUUID();
  const send=body=>fetch('http://127.0.0.1:3001/api/visitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    const responses=await Promise.all(Array.from({length:4},()=>send({visitorId})));
    for(const response of responses){assert.equal(response.status,201);const counts=await response.json();assert.ok(counts.daily>=1);assert.ok(counts.total>=1);}
    const [rows]=await db.execute('SELECT COUNT(*) AS count FROM site_visits WHERE visitor_id=?',[visitorId]);
    assert.equal(rows[0].count,1);
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const [dates]=await db.execute('SELECT DATE_FORMAT(visit_date, "%Y-%m-%d") AS day FROM site_visits WHERE visitor_id=?',[visitorId]);
    assert.equal(dates[0].day,day);
    assert.equal((await send({visitorId:'invalid'})).status,400);
  } finally { await db.execute('DELETE FROM site_visits WHERE visitor_id=?',[visitorId]);await db.end(); }
});
