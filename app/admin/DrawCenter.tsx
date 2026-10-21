'use client';
import {useState} from 'react';
import type {Raffle} from '@/lib/raffles';
import {statusLabel} from '@/lib/raffles';
import DrawConsole from './DrawConsole';

export default function DrawCenter({raffles}:{raffles:Raffle[]}) {
  const available=raffles.filter(r=>r.status!=='draft');
  const [selectedId,setSelectedId]=useState(available[0]?.id||'');
  const [busy,setBusy]=useState(false);
  const selected=available.find(r=>r.id===selectedId)||available[0];
  if(!selected)return <p className="notice">Publique um sorteio para abrir a central da roleta.</p>;
  return <DrawConsole key={selected.id} raffle={selected} onBusyChange={setBusy} selection={
    <label className="draw-selector">Selecionar sorteio
      <select value={selected.id} disabled={busy} onChange={e=>setSelectedId(e.target.value)}>
        {available.map(r=><option key={r.id} value={r.id}>{r.title} · {r.prize} · {r.archived_at?'Arquivado · ':''}{statusLabel[r.status]}</option>)}
      </select>
    </label>
  }/>;
}
