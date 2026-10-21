'use client';
import {useState,useRef,useEffect,useCallback,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import Roulette from '../Roulette';
import Fireworks from '../Fireworks';
import DrawMusic from './DrawMusic';
import type {Raffle} from '@/lib/raffles';
import type {WheelPerson} from '@/lib/wheel';

type Result={draw_id:string;winner_ticket:number;winner_alias:string};
type History={id:string;reason:string;invalidated_at:string;original_draw:{winner_alias:string;winner_ticket:number}};

export default function DrawConsole({raffle,selection,onBusyChange}:{raffle:Raffle;selection?:ReactNode;onBusyChange?:(busy:boolean)=>void}) {
  const router=useRouter();
  const [people,setPeople]=useState<WheelPerson[]>([]);
  const [loading,setLoading]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<Result|null>(null);
  const [history,setHistory]=useState<History[]>([]);
  const [reason,setReason]=useState('');
  const [settled,setSettled]=useState(false);
  const [animateResult,setAnimateResult]=useState(false);
  const [search,setSearch]=useState('');
  const [musicPlaying,setMusicPlaying]=useState(false);
  const [audioError,setAudioError]=useState('');
  const audioRef=useRef<HTMLAudioElement>(null);
  const drawPending=useRef(false);
  const loadSerial=useRef(0);

  useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false)},[busy,onBusyChange]);
  function stopMusic(){const audio=audioRef.current;if(audio){audio.pause();audio.currentTime=0}setMusicPlaying(false)}
  function playMusic(){const audio=audioRef.current;if(!audio)return;setAudioError('');audio.currentTime=0;void audio.play().catch(()=>{setMusicPlaying(false);setAudioError('Pressione Play no player para iniciar o áudio.')})}
  const load=useCallback(async()=>{
    const serial=++loadSerial.current;
    setLoading(true);setError('');
    try {
      const response=await fetch(`/api/participants?raffle=${raffle.id}&scope=admin`);
      const data=await response.json();
      if(serial!==loadSerial.current||drawPending.current)return;
      if(!response.ok)throw new Error(data.error||'Falha ao carregar participantes.');
      setPeople(data.participants);setHistory(data.history||[]);setLoaded(true);
      if(data.winner){setAnimateResult(false);setSettled(true);setResult({draw_id:data.winner.draw_id,winner_ticket:data.winner.ticket,winner_alias:data.winner.label})}
      else{setResult(null);setSettled(false);setAnimateResult(false)}
    } catch(e){if(serial===loadSerial.current)setError(e instanceof Error?e.message:'Falha ao carregar participantes.')}
    finally{if(serial===loadSerial.current)setLoading(false)}
  },[raffle.id]);
  useEffect(()=>{void load();return()=>{loadSerial.current++}},[load,raffle.entry_count]);

  async function draw(){
    if(drawPending.current||loading||busy||!loaded||!people.length)return;
    if(!window.confirm('Girar a roleta e registrar o ganhador?'))return;
    drawPending.current=true;setBusy(true);setError('');
    if(raffle.prize_kind==='skin')playMusic();
    try {
      const response=await fetch(`/api/admin/raffles/${raffle.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'draw'})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Não foi possível sortear.');
      if(!people.some(p=>p.ticket===data.winner_ticket))throw new Error('Resultado registrado. Atualize a lista para consultar o ganhador.');
      setAnimateResult(true);setSettled(false);setResult(data);
    } catch(e){setError(e instanceof Error?e.message:'Falha ao sortear.');drawPending.current=false;setBusy(false);stopMusic()}
  }
  async function reset(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!result||drawPending.current||busy||reason.trim().length<10)return;
    if(!window.confirm('Desclassificar este ganhador e liberar um novo giro? O motivo e o resultado anterior ficarão no histórico, e essa inscrição será excluída dos próximos giros deste sorteio.'))return;
    setBusy(true);setError('');stopMusic();
    try {
      const response=await fetch(`/api/admin/raffles/${raffle.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reset',draw_id:result.draw_id,reason:reason.trim()})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Não foi possível desclassificar.');
      setResult(null);setSettled(false);setAnimateResult(false);setReason('');setLoaded(false);
      await load();router.refresh();
    } catch(e){setError(e instanceof Error?e.message:'Falha ao desclassificar.')}
    finally{setBusy(false)}
  }
  const visible=people.filter(p=>`${p.label} ${p.ticket}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="draw-console" aria-label="Central da roleta">
    <div className="draw-console-heading"><span>✳ Central da roleta</span><small>{raffle.title}</small></div>
    <div className="draw-console-grid">
      <div className="draw-stage">
        <Fireworks active={settled&&animateResult}/>
        <Roulette participants={people} count={people.length} winnerTicket={result?.winner_ticket} prize={raffle.prize} animate={animateResult} onSettled={()=>{drawPending.current=false;setSettled(true);setBusy(false);router.refresh()}}/>
        {result&&settled&&<div className="winner-banner"><small>GANHADOR REGISTRADO</small><strong>{people.find(p=>p.ticket===result.winner_ticket)?.label||result.winner_alias}</strong><span>Número #{result.winner_ticket}</span></div>}
        {selection}
      </div>
      <aside>
        <span className="eyebrow">PARTICIPANTES ELEGÍVEIS</span><h3>Os nomes da tropa.</h3>
        <p>{people.length} elegível(is) de {raffle.entry_count} inscrição(ões). Os desclassificados permanecem na aba Participantes.</p>
        <input type="search" placeholder="Buscar participante" aria-label="Buscar participante" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="console-names">{visible.map(p=><div key={p.ticket}><b>{p.label}</b></div>)}</div>
        {loading&&<p role="status">Carregando todos os participantes…</p>}
        {error&&<p className="error" role="alert">{error}</p>}
        <div className="draw-controls">
          <button className="ghost" disabled={loading||busy} onClick={()=>void load()}>Atualizar lista ↻</button>
          <button className="button draw-button" disabled={busy||!loaded||loading||!people.length||raffle.status!=='closed'||Boolean(result)} onClick={draw}>{busy?'Processando…':result||raffle.status==='drawn'?'Sorteio realizado':'Girar roleta e sortear ✳'}</button>
        </div>
        {raffle.prize_kind==='skin'&&<DrawMusic playing={musicPlaying} audioRef={audioRef} audioError={audioError} onPlay={playMusic} onStop={stopMusic} onPlayingChange={setMusicPlaying} onError={()=>setAudioError('Não foi possível carregar o áudio.')}/>}
        {raffle.status==='open'&&<p>Encerre as inscrições para liberar o sorteio.</p>}
        {result&&settled&&<form className="draw-reset stack" onSubmit={reset}>
          <h4>Resetar para novo sorteio</h4>
          <p>Se o ganhador não cumprir as regras, informe o motivo. A inscrição será desclassificada e o próximo giro usará os demais participantes elegíveis.</p>
          <label>Motivo da desclassificação<textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={1000} required placeholder="Informe qual regra não foi cumprida."/></label>
          <button className="ghost" disabled={busy||loading||reason.trim().length<10}>Desclassificar e liberar novo giro</button>
        </form>}
        {history.length>0&&<div className="draw-history"><h4>Histórico de desclassificações</h4>{history.map(h=><article key={h.id}><b>{h.original_draw.winner_alias} · #{h.original_draw.winner_ticket}</b><p>{h.reason}</p><small>{new Date(h.invalidated_at).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'})}</small></article>)}</div>}
      </aside>
    </div>
  </section>;
}
