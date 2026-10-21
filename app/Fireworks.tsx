'use client';
import {useEffect,useRef} from 'react';
import {launchFireworks} from '@/lib/fireworks';
export default function Fireworks({active}:{active:boolean}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{if(active&&ref.current)return launchFireworks(ref.current)},[active]);return <canvas ref={ref} className="winner-fireworks" aria-hidden="true"/>}
