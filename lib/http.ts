import {NextResponse} from 'next/server';
import {headers} from 'next/headers';
import {isValidAdminCookie} from './auth';
import {isSameOriginRequest,checkRateLimit,getClientIp} from './security';
export function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function admin(){return isValidAdminCookie((await headers()).get('cookie'))}
export function guard(req:Request,scope:string,limit=30){if(!isSameOriginRequest(req))return json({error:'Origem inválida.'},403);if(!checkRateLimit(`${scope}:${getClientIp(req)}`,limit,60000).allowed)return json({error:'Muitas tentativas. Aguarde um minuto.'},429);return null}
export function failure(e:unknown){if(e instanceof SyntaxError)return json({error:'Dados inválidos.'},400);if(e instanceof Error&&e.message==='PAYLOAD_TOO_LARGE')return json({error:'Envio muito grande.'},413);console.error('Falha na operação:',e instanceof Error?e.message:'erro');return json({error:'Não foi possível concluir. Verifique a configuração ou tente novamente.'},500)}
