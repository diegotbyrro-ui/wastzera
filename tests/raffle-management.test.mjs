import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';

test('editar, excluir e finalizar preserva cadastros; arquivamento integra com reset e restauração',async()=>{
  const db=new PGlite({extensions:{pgcrypto}});
  try {
    const q=async(text,args=[])=>(await db.query(text,args)).rows;
    const migration=async(name)=>db.exec(readFileSync(new URL('../database/'+name,import.meta.url),'utf8'));
    await db.exec('create schema extensions; create role anon; create role authenticated; create role service_role;');
    await migration('001_wastzera.sql');await migration('004_twitch_nick.sql');await migration('005_redraw.sql');
    const legacy=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,status,capacity,entry_count) values('resultado-antigo','Resultado antigo','Skin','','Regras anteriores',now()+interval '1 day','closed',100,1) returning id"))[0].id;
    await q("insert into wz_entries(raffle_id,ticket,name,alias,email,phone,rules_snapshot) values($1,1,'Antigo','Antigo','antigo@example.invalid','00000000000','Regras anteriores')",[legacy]);
    const previous=(await q('select wz_draw($1,0,1) as r',[legacy]))[0].r;
    await migration('006_raffle_management.sql');
    const current=async(id)=>(await q('select * from wz_raffles where id=$1',[id]))[0];
    assert.equal((await current(legacy)).archive_source,'completed');
    assert.equal((await q('select id from wz_draws where raffle_id=$1',[legacy]))[0].id,previous.draw_id);
    const archive=async(id,value)=>(await q('select wz_archive_raffle($1,$2) as r',[id,value]))[0].r;
    assert.equal((await archive(legacy,false)).ok,true);
    await migration('006_raffle_management.sql');
    assert.equal((await current(legacy)).archived_at,null,'a migração repetida preserva restauração explícita');

    const r=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,status,capacity,puzzle_hash,youtube_url) values('editar-teste','Título original','Skin','','Regras completas originais',now()+interval '1 day','open',10,'codigo-antigo','https://youtu.be/exemplo') returning id"))[0].id;
    for(let n=1;n<=2;n++)assert.equal((await q("select wz_register($1,$2,$3,$4,$5,'codigo-antigo',$6) as r",[r,'Pessoa '+n,'Pessoa '+n,`p${n}@example.invalid`,`0000000000${n}`,'nick_'+n]))[0].r.ok,true);
    const entries=await q('select * from wz_entries where raffle_id=$1 order by ticket',[r]);
    assert.equal((await archive(r,true)).ok,true);
    assert.equal((await current(r)).status,'closed');
    assert.equal((await current(r)).archive_source,'manual');
    assert.ok((await current(r)).archived_at);
    assert.equal((await q("select wz_register($1,'Nova','Nova','nova@example.invalid','00000009999','codigo-antigo','nick_novo') as r",[r]))[0].r.code,'CLOSED');
    assert.equal((await q('select wz_draw($1,0,2) as r',[r]))[0].r.code,'INVALID_STATE');
    assert.deepEqual(await q('select * from wz_entries where raffle_id=$1 order by ticket',[r]),entries);

    const values={title:'Título corrigido',prize:'GIFT CARD',prize_key:'gift',prize_kind:'gift',prize_value:250,rules:'Regras completas corrigidas',ends_at:new Date(Date.now()+86400000).toISOString(),capacity:20,youtube_url:'https://youtu.be/exemplo',code_mode:'letters',puzzle_parts:['W','A','S','T'],puzzle_hash:createHash('sha256').update('WAST').digest('hex')};
    const edit=async(changes={})=>(await q('select wz_edit_raffle($1,$2::jsonb) as r',[r,JSON.stringify({...values,...changes})]))[0].r;
    assert.equal((await edit()).code,'LOCKED');
    await archive(r,false);
    assert.equal((await current(r)).status,'closed','restaurar não reabre inscrições');
    assert.equal((await edit({capacity:1})).code,'CAPACITY');
    assert.equal((await edit({youtube_url:''})).code,'NO_VIDEO');
    assert.equal((await edit({ends_at:'2020-01-01T00:00:00Z'})).code,'DATE');
    assert.equal((await edit()).ok,true);
    const edited=await current(r);
    assert.equal(edited.title,'Título corrigido');assert.equal(edited.prize_key,'gift');assert.equal(Number(edited.prize_value),250);
    assert.equal(edited.slug,'editar-teste');assert.equal(edited.entry_count,2);assert.equal(edited.status,'closed');
    assert.deepEqual(edited.puzzle_parts,['W','A','S','T']);
    assert.deepEqual(await q('select * from wz_entries where raffle_id=$1 order by ticket',[r]),entries,'edição preserva cadastros e regras aceitas');

    const draw=(await q('select wz_draw($1,0,2) as r',[r]))[0].r;
    assert.equal(draw.ok,true);assert.equal((await current(r)).archive_source,'completed');
    assert.equal((await q('select count(*)::int as n from wz_raffles where id=$1 and archived_at is null',[r]))[0].n,0);
    assert.equal((await edit()).code,'LOCKED');
    assert.equal((await q("select wz_invalidate_draw($1,$2,'Reset manual pelo administrador.') as r",[r,draw.draw_id]))[0].r.ok,true);
    assert.equal((await current(r)).archived_at,null);assert.equal((await current(r)).status,'closed');
    const redraw=(await q('select wz_draw($1,0,1) as r',[r]))[0].r;
    assert.equal(redraw.winner_ticket,2);
    await archive(r,true);
    await q("select wz_invalidate_draw($1,$2,'Reset manual pelo administrador.')",[r,redraw.draw_id]);
    assert.ok((await current(r)).archived_at,'reset não desfaz exclusão manual');
    assert.equal((await current(r)).archive_source,'manual');
    assert.equal((await q('select count(*)::int as n from wz_entries where raffle_id=$1',[r]))[0].n,2);
    assert.equal((await q('select count(*)::int as n from wz_draw_invalidations where raffle_id=$1',[r]))[0].n,2);

    const draft=(await q("insert into wz_raffles(slug,title,prize,description,rules,ends_at,status,capacity,puzzle_hash,youtube_url) values('rascunho','Rascunho','Skin','','Regras completas',now()+interval '1 day','draft',10,'hash','https://youtu.be/exemplo') returning id"))[0].id;
    await archive(draft,true);
    assert.equal((await q("select wz_transition($1,'open') as r",[draft]))[0].r.code,'ARCHIVED');
    await archive(draft,false);
    assert.equal((await q("select wz_transition($1,'open') as r",[draft]))[0].r.ok,true);
    await db.exec('set role anon');
    await assert.rejects(()=>archive(r,true));await assert.rejects(()=>edit());
    await db.exec('reset role;set role service_role');
    await assert.rejects(()=>q('delete from wz_raffles where id=$1',[r]));
  } finally {await db.close()}
});
