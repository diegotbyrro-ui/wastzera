'use client';
import type {RefObject} from 'react';
export default function DrawMusic({playing,audioRef,audioError,onPlay,onStop,onPlayingChange,onError}:{playing:boolean;audioRef:RefObject<HTMLAudioElement|null>;audioError:string;onPlay:()=>void;onStop:()=>void;onPlayingChange:(playing:boolean)=>void;onError:()=>void}){
return <section className="draw-music" data-draw-music><div className="music-heading"><div><span className="eyebrow">TRILHA DO SORTEIO DE SKINS</span><strong>♪ Música da roleta</strong></div></div>
<audio ref={audioRef} controls loop preload="metadata" src="/audio/sorteio-skins.mp3" aria-label="Música do sorteio" onPlay={()=>onPlayingChange(true)} onPause={()=>onPlayingChange(false)} onError={onError}>Seu navegador não suporta reprodução de áudio.</audio>
<div className="music-controls"><button type="button" data-music-play className="ghost music-play" onClick={onPlay}>▶ {playing?'Reiniciar música':'Ouvir música'}</button><button type="button" data-music-stop className="ghost" onClick={onStop}>■ Parar música</button></div>
<small>Tema Banheira do Gugu · áudio enviado. A música começa ao girar a roleta; use o player para pausar ou ajustar o volume.</small>{audioError&&<p className="error" role="status">{audioError}</p>}</section>}
