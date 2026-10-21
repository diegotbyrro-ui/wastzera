import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('fluxo SQL: código do vídeo, duplicidade, limites, encerramento e um único resultado',async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
 await db.exec('create schema extensions; create role anon; create role authenticated; create role service_role;');
 await db.exec(readFileSync(new URL('../database/001_wastzera.sql',import.meta.url),'utf8'));
 // The migration is repeatable without losing registrations.
 await db.exec(readFileSync(new URL('../database/002_codigo_video.sql',import.meta.url),'utf8'));
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const legacy=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,capacity,status,entry_count) values('legado','Legado','Prêmio','Descrição','Regras completas',now()+interval '1 day',10,'closed',1) returning id"))[0].id;
 await q("insert into wz_entries(raffle_id,ticket,name,alias,email,phone,rules_snapshot) values($1,1,'Pessoa Antiga','Pessoa A.','antiga@example.com','82999998888','Regras completas')",[legacy]);
 await db.exec(readFileSync(new URL('../database/004_twitch_nick.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../database/004_twitch_nick.sql',import.meta.url),'utf8'));
 assert.equal((await q('select twitch_nick from wz_entries where raffle_id=$1',[legacy]))[0].twitch_nick,'');
 assert.equal((await q("select to_regprocedure('public.wz_register(uuid,text,text,text,text,text)') as old"))[0].old,null);

 const r=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,capacity) values('teste','Teste','Prêmio','Descrição','Regras completas',now()+interval '1 day',2) returning id"))[0].id;
 const transition=async(a)=>(await q('select wz_transition($1,$2) as result',[r,a]))[0].result;
 assert.equal((await transition('open')).code,'NO_CODE');
 const hash=createHash('sha256').update('WZ-TESTE').digest('hex');
 await q("update wz_raffles set puzzle_hash=$1,puzzle_parts=ARRAY['W','A','S','T'],youtube_url='https://youtu.be/exemplo' where id=$2",[hash,r]);
 assert.equal((await transition('open')).ok,true);
 const register=async(n,code=hash)=>(await q('select wz_register($1,$2,$3,$4,$5,$6,$7) as result',[r,'Pessoa '+n,'nick'+n,`test${n}@example.com`,'8299999000'+n,code,'nick_'+n]))[0].result;
 assert.equal((await register(1,'errado')).code,'CODE_INVALID');
 assert.deepEqual(await register(1),{ok:true,ticket:1});
 assert.equal((await q('select twitch_nick from wz_entries where raffle_id=$1',[r]))[0].twitch_nick,'nick_1');
 assert.equal((await q('select wz_register($1,$2,$3,$4,$5,$6,$7) as result',[r,'Pessoa','Pessoa','nova@example.com','82988887777',hash,'bad nick']))[0].result.code,'INVALID_NICK');
 assert.equal((await register(1)).code,'DUPLICATE');
 assert.deepEqual(await register(2),{ok:true,ticket:2});
 assert.equal((await register(3)).code,'FULL');
 assert.equal((await transition('close')).ok,true);
 assert.equal((await register(4)).code,'CLOSED');
 assert.equal((await transition('open')).code,'INVALID_STATE');
 const draw=async(offset,count)=>(await q('select wz_draw($1,$2,$3) as result',[r,offset,count]))[0].result;
 assert.equal((await draw(0,3)).code,'POOL_CHANGED');
 assert.equal((await draw(2,2)).code,'POOL_CHANGED');
 const result=await draw(1,2);assert.equal(result.ok,true);assert.equal(result.winner_ticket,2);assert.equal(result.winner_alias,'nick2');
 assert.equal((await draw(0,2)).code,'INVALID_STATE');
 const stored=(await q('select * from wz_draws where raffle_id=$1',[r]))[0];
 const ids=await q('select id from wz_entries where raffle_id=$1 order by ticket',[r]);
 assert.equal(stored.pool_hash,createHash('sha256').update(ids.map(x=>x.id).join(',')).digest('hex'));
 assert.equal(stored.pool_count,2);
 await db.exec('set role anon');
 await assert.rejects(()=>db.query('select * from wz_entries'));
 await assert.rejects(()=>db.query('select * from wz_draws'));
 await assert.rejects(()=>db.query('select wz_draw($1,0,2)',[r]));
 await db.exec('reset role; set role service_role');
 await assert.rejects(()=>db.query('delete from wz_entries'));
 await assert.rejects(()=>db.query('update wz_draws set winner_ticket=99'));
 await db.exec('reset role');
 // Unrestricted raffle still enforces capacity, with concurrent attempts serialized by row lock.
 const r2=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,capacity,require_code,status,puzzle_hash) values('publico','Teste','Prêmio','Descrição','Regras completas',now()+interval '1 day',1,true,'open','test-hash') returning id"))[0].id;
 const regs=await Promise.all([1,2,3].map(n=>q('select wz_register($1,$2,$3,$4,$5,$6,$7) as result',[r2,'Pessoa '+n,'nick'+n,`test${n}@example.com`,'8299999000'+n,'test-hash','nick_'+n])));
 assert.equal(regs.filter(x=>x[0].result.ok).length,1);
 assert.equal(regs.filter(x=>x[0].result.code==='FULL').length,2);
 }finally{await db.close()}
});
