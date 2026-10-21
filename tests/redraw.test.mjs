import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('novo giro preserva histórico, exclui desclassificados e rejeita reset duplicado ou desatualizado',async()=>{
  const db=new PGlite({extensions:{pgcrypto}});
  try {
    const q=async(text,args=[])=>(await db.query(text,args)).rows;
    const run=async(name)=>db.exec(readFileSync(new URL('../database/'+name,import.meta.url),'utf8'));
    await db.exec('create schema extensions; create role anon; create role authenticated; create role service_role;');
    await run('001_wastzera.sql');await run('004_twitch_nick.sql');
    const id=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,status,capacity,entry_count) values('reset-teste','Teste','Skin','','Regras',now()+interval '1 day','closed',100,3) returning id"))[0].id;
    for(let n=1;n<=3;n++)await q("insert into wz_entries(raffle_id,ticket,name,alias,email,phone,twitch_nick,rules_snapshot) values($1,$2,'Pessoa','Pessoa', $3,$4,'teste','Regras')",[id,n,`p${n}@example.invalid`,`0000000000${n}`]);
    const draw=async(offset,count)=>(await q('select wz_draw($1,$2,$3) as r',[id,offset,count]))[0].r;
    // Uma migração feita depois de um sorteio preserva o ganhador já registrado.
    const first=await draw(0,3);assert.equal(first.ok,true);
    await run('005_redraw.sql');await run('005_redraw.sql');
    assert.equal((await q('select id from wz_draws'))[0].id,first.draw_id);
    const reset=async(drawId,reason='Não cumpriu a regra de elegibilidade.')=>(await q('select wz_invalidate_draw($1,$2,$3) as r',[id,drawId,reason]))[0].r;
    assert.equal((await reset(first.draw_id,'curto')).code,'INVALID_REASON');
    assert.equal((await reset('00000000-0000-4000-8000-000000000000')).code,'STALE_RESULT');
    const attempts=await Promise.all([reset(first.draw_id),reset(first.draw_id)]);
    assert.equal(attempts.filter(r=>r.ok).length,1);
    assert.equal((await q('select count(*)::int as n from wz_draw_invalidations'))[0].n,1);
    assert.equal((await q('select original_draw from wz_draw_invalidations'))[0].original_draw.id,first.draw_id);
    assert.equal((await q('select status,entry_count from wz_raffles where id=$1',[id]))[0].entry_count,3);
    assert.equal((await q('select count(*)::int as n from wz_entries where disqualified_at is null'))[0].n,2);
    assert.equal((await draw(0,3)).code,'POOL_CHANGED');
    const second=await draw(0,2);assert.equal(second.winner_ticket,2);
    assert.equal((await reset(first.draw_id)).code,'STALE_RESULT');
    assert.equal((await q('select id from wz_draws'))[0].id,second.draw_id);
    assert.equal((await draw(0,2)).code,'INVALID_STATE');
    assert.equal((await reset(second.draw_id)).ok,true);
    const last=await draw(0,1);assert.equal(last.winner_ticket,3);
    assert.equal((await reset(last.draw_id)).ok,true);
    assert.equal((await draw(0,0)).code,'POOL_CHANGED');
    assert.equal((await q('select count(*)::int as n from wz_entries'))[0].n,3);
    assert.equal((await q('select count(*)::int as n from wz_draw_invalidations'))[0].n,3);
    await run('005_redraw.sql');
    assert.equal((await q('select count(*)::int as n from wz_draw_invalidations'))[0].n,3);
    await db.exec('set role anon');
    await assert.rejects(()=>q('select * from wz_draw_invalidations'));
    await assert.rejects(()=>reset(last.draw_id));
    await db.exec('reset role;set role service_role');
    await assert.rejects(()=>q('delete from wz_draw_invalidations'));
    await assert.rejects(()=>q('update wz_entries set disqualified_at=null'));
  } finally {await db.close()}
});
