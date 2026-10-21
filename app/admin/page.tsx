import Link from 'next/link';
import {Header,Footer} from '../components';
import {admin} from '@/lib/http';
import {configured,Raffle,Draw,dateLabel,statusLabel} from '@/lib/raffles';
import {getSupabaseAdmin} from '@/lib/supabase';
import AdminTools from './AdminTools';
import DrawCenter from './DrawCenter';
import RaffleManagement from './RaffleManagement';
export const dynamic='force-dynamic';

export default async function Page(){
  if(!await admin())return <><Header/><main className="login form-panel"><span className="eyebrow">BASTIDORES DO DROP</span><h1>ADMIN Wastzera.</h1><p>Entre para gerenciar os sorteios.</p><form action="/api/admin/login" method="post" className="stack"><label>Senha administrativa<input name="password" type="password" autoComplete="current-password" required maxLength={200}/></label><button className="button">Entrar ↗</button></form></main><Footer/></>;
  let raffles:Raffle[]=[],draws:Draw[]=[],failed=false;
  if(configured()){
    const db=getSupabaseAdmin();
    const [a,b]=await Promise.all([db.from('wz_raffles').select('*').order('created_at',{ascending:false}),db.from('wz_draws').select('*')]);
    raffles=a.data||[];draws=b.data||[];failed=Boolean(a.error||b.error);
  }
  const active=raffles.filter(r=>!r.archived_at);
  const archived=raffles.filter(r=>r.archived_at);
  function card(r:Raffle,isArchived=false){
    const draw=draws.find(d=>d.raffle_id===r.id);
    return <article key={r.id} className="admin-card">
      <div className="section-head"><div>
        <span className="eyebrow">{isArchived?'ARQUIVADO · ':''}{statusLabel[r.status]} · {r.entry_count}/{r.capacity} PARTICIPAÇÕES</span>
        <h2>{r.title}</h2><p>{r.prize} · até {dateLabel(r.ends_at)}</p>
        {isArchived&&<small>{r.archive_source==='completed'?'Arquivado automaticamente após o resultado.':'Excluído da página pública.'} Dados e cadastros preservados.</small>}
      </div>{!isArchived&&r.status!=='draft'&&<Link href={`/sorteio/${r.slug}`}>Abrir página ↗</Link>}</div>
      <RaffleManagement raffle={r}/>
      {!isArchived&&<AdminTools raffle={r}/>}
      <p><Link href={`/admin/participantes?raffle=${r.id}`}>Consultar participantes e exportar Word/Excel ↗</Link></p>
      {draw&&<p className="notice">Ganhador: <b>{draw.winner_alias}</b> · número #{draw.winner_ticket} · {draw.pool_count} participações · {dateLabel(draw.drawn_at)}</p>}
    </article>;
  }
  return <><Header/><main className="wrap admin">
    <div className="section-head"><div><span className="eyebrow">PAINEL ADMINISTRATIVO</span><h1>Seu comando dos drops.</h1></div><form action="/api/admin/logout" method="post"><button className="ghost">Sair ↗</button></form></div>
    {(!configured()||failed)&&<p role="alert" className="notice">{failed?'Não foi possível consultar o banco. Verifique a migração SQL e as permissões.':'Configure o Supabase e execute o SQL antes de criar sorteios.'}</p>}
    <nav className="admin-tabs"><Link className="active" href="/admin">Sorteios e roleta</Link><Link href="/admin/participantes">Participantes</Link><a href="#arquivados">Arquivados ({archived.length})</a></nav>
    <div className="admin-guide"><b>01 · Crie o sorteio</b><b>02 · Prepare o código</b><b>03 · Publique o vídeo</b><b>04 · Gire a roleta</b></div>
    <div className="stats"><div><small>SORTEIOS ATIVOS</small><strong>{active.length}</strong></div><div><small>PARTICIPAÇÕES SALVAS</small><strong>{raffles.reduce((a,r)=>a+r.entry_count,0)}</strong></div><div><small>RESULTADOS SALVOS</small><strong>{draws.length}</strong></div></div>
    <AdminTools canCreate={configured()&&!failed}/>
    <DrawCenter raffles={raffles}/>
    <div className="admin-list">{active.map(r=>card(r))}</div>
    <section id="arquivados" className="archived-raffles"><h2>Sorteios arquivados.</h2><p>Os sorteios finalizados ou excluídos da página pública ficam salvos aqui com seus participantes e resultados.</p>
      <details><summary>Consultar {archived.length} sorteio(s) arquivado(s)</summary><div className="admin-list">{archived.map(r=>card(r,true))}</div></details>
    </section>
  </main><Footer/></>;
}
