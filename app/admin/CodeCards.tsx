'use client';
import {useState,useEffect,useId} from 'react';
function CodeCardsContent({parts}:{parts:string[]}){function download(part:string,i:number){part=part.replace(/[<>&"']/g,'');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><g transform="translate(1920 0) scale(-1 1)"><text x="960" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="${part.length>12?95:150}" font-weight="900" fill="white" stroke="#211035" stroke-width="5" paint-order="stroke">${part}</text></g><text x="960" y="730" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#b996ff">PISTA ${i+1} / 4</text></svg>`;const u=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=u;a.download=`pista-${i+1}-espelhada.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}return <div><div className="section-head"><div><span className="eyebrow">PISTAS PARA A EDIÇÃO DO VÍDEO</span><p>Código completo: <b>{parts.join(' ')}</b></p></div><button type="button" className="ghost" onClick={()=>{const u=URL.createObjectURL(new Blob([parts.map((v,i)=>`Pista ${i+1}: ${v}`).join('\n')+'\n\nCódigo completo: '+parts.join(' ')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='codigo-do-sorteio.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}}>Baixar roteiro do código ↓</button></div><div className="code-cards">{parts.map((part,i)=><div className="code-card" key={i}><small>PISTA {i+1} / 4</small><b className="mirrored">{part}</b><button type="button" className="ghost" onClick={()=>download(part,i)}>Baixar SVG espelhado ↓</button></div>)}</div><small>SVGs transparentes em 1920 × 1080. Se o editor não importar SVG, converta-os para PNG antes de usar. Distribua as pistas ao longo do vídeo e mantenha esta ordem.</small></div>}

export default function CodeCards({parts}:{parts:string[]}) {
  const [visible,setVisible]=useState(false);
  const regionId=useId();
  const codeIdentity=JSON.stringify(parts);

  useEffect(()=>{
    setVisible(false);
  },[codeIdentity]);

  useEffect(()=>{
    const hide=()=>setVisible(false);
    const onVisibility=()=>{
      if(document.hidden)hide();
    };

    window.addEventListener('blur',hide);
    document.addEventListener('visibilitychange',onVisibility);

    return()=>{
      window.removeEventListener('blur',hide);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[]);

  return (
    <section className="code-kit" aria-label="Pistas privadas do sorteio">
      <div className="section-head">
        <div>
          <span className="eyebrow">PISTAS DO VÍDEO · PRIVADO</span>
          <p>
            {visible
              ? 'Palavras-chave visíveis.'
              : 'Palavras-chave ocultas para a transmissão.'}
          </p>
        </div>

        <button
          type="button"
          className="ghost"
          aria-expanded={visible}
          aria-controls={regionId}
          onClick={()=>setVisible(v=>!v)}
        >
          {visible ? 'Ocultar palavras-chave' : 'Mostrar palavras-chave'}
        </button>
      </div>

      <div id={regionId}>
        {visible && <CodeCardsContent parts={parts}/>}
      </div>
    </section>
  );
}
