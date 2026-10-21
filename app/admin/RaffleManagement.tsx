'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {Raffle} from '@/lib/raffles';
import {catalog} from '@/lib/catalog';
import PrizePicker from './PrizePicker';
import PrizeVisual from '../PrizeVisual';

function localDate(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return '';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}

export default function RaffleManagement({raffle}:{raffle:Raffle}) {
  const router=useRouter();
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [prizeKey,setPrizeKey]=useState(raffle.prize_key||catalog.find(p=>p.name===raffle.prize)?.id||'ak-redline');
  const [mode,setMode]=useState(raffle.code_mode);
  const [parts,setParts]=useState(raffle.puzzle_parts?.length===4?raffle.puzzle_parts:['','','','']);
  const selected=catalog.find(p=>p.id===prizeKey)||catalog[0];
  const archived=Boolean(raffle.archived_at);

  async function send(body:unknown) {
    setBusy(true);setError('');
    try {
      const response=await fetch(`/api/admin/raffles/${raffle.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Não foi possível salvar.');
      setEditing(false);router.refresh();
    } catch(e){setError(e instanceof Error?e.message:'Falha na conexão.')}
    finally{setBusy(false)}
  }
  async function archive() {
    if(!window.confirm('Excluir este sorteio da página pública? Os participantes, contatos e resultados ficarão salvos em Arquivados. As inscrições abertas serão encerradas.'))return;
    await send({action:'archive'});
  }
  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields=new FormData(e.currentTarget);
    const end=new Date(String(fields.get('ends_at')));
    if(Number.isNaN(end.getTime())){setError('Confira a data de encerramento.');return}
    await send({action:'edit',values:{...Object.fromEntries(fields),prize_key:prizeKey,prize_value:Number(fields.get('prize_value')||0),capacity:Number(fields.get('capacity')),ends_at:end.toISOString(),code_mode:mode,fragments:parts}});
  }
  return <div className="raffle-management">
    <div className="actions">
      {!archived&&raffle.status!=='drawn'&&<button type="button" className="ghost" disabled={busy} onClick={()=>setEditing(v=>!v)}>{editing?'Cancelar edição':'Editar sorteio'}</button>}
      {archived?<button type="button" className="ghost" disabled={busy} onClick={()=>void send({action:'restore'})}>Restaurar sorteio</button>:<button type="button" className="ghost" disabled={busy} onClick={()=>void archive()}>Excluir sorteio</button>}
    </div>
    {editing&&!archived&&<form className="create-grid raffle-editor" onSubmit={save}>
      <label className="wide">Título do sorteio<input name="title" defaultValue={raffle.title} minLength={3} maxLength={100} required/></label>
      <div className="wide admin-prize-preview"><PrizeVisual name={selected.name} kind={selected.kind} assetKey={selected.id}/><div><span className="eyebrow">PRÊMIO</span><h3>{selected.name}</h3></div></div>
      <PrizePicker value={prizeKey} onChange={setPrizeKey}/>
      <label>Valor do prêmio (R$)<input name="prize_value" type="number" min={selected.kind==='gift'?0.01:0} max={1000000} step="0.01" defaultValue={raffle.prize_value} required/></label>
      <label className="wide">Link do vídeo no YouTube<input name="youtube_url" type="url" defaultValue={raffle.youtube_url} required={raffle.status!=='draft'}/></label>
      <label>Encerramento (horário deste computador)<input name="ends_at" type="datetime-local" defaultValue={localDate(raffle.ends_at)} required/></label>
      <label>Limite de participantes<input name="capacity" type="number" min={Math.max(1,raffle.entry_count)} max={100000} defaultValue={raffle.capacity} required/></label>
      <label>Tipo de código<select value={mode} onChange={e=>{setMode(e.target.value as 'letters'|'words');setParts(['','','',''])}}><option value="words">Quatro palavras</option><option value="letters">Quatro letras</option></select></label>
      <fieldset className="wide puzzle-editor"><legend>Quatro partes do código — edição privada</legend><div className="fragment-inputs">{parts.map((part,i)=><label key={i}>Parte {i+1}<input type="password" autoComplete="new-password" value={part} onChange={e=>setParts(current=>current.map((old,n)=>n===i?e.target.value.toUpperCase():old))} minLength={mode==='letters'?1:2} maxLength={mode==='letters'?1:24} required/></label>)}</div><small>Os cadastros já confirmados serão preservados. Novas inscrições usarão o código atualizado.</small></fieldset>
      <label className="wide">Regras completas<textarea name="rules" defaultValue={raffle.rules} minLength={20} maxLength={6000} required/></label>
      <p className="wide muted">O endereço da página e os cadastros existentes serão preservados. A edição não reabre inscrições encerradas.</p>
      <button className="button" disabled={busy}>{busy?'Salvando…':'Salvar alterações'}</button>
    </form>}
    {error&&<p className="error" role="alert">{error}</p>}
  </div>;
}
