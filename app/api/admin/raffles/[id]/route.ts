import {createHash,randomInt} from 'node:crypto';
import {z} from 'zod';
import {youtubeSchema,raffleSchema,normalizeCode} from '@/lib/validation';
import {catalog} from '@/lib/catalog';
import {getSupabaseAdmin} from '@/lib/supabase';
import {readJsonWithLimit} from '@/lib/security';
import {admin,guard,json,failure} from '@/lib/http';

const action=z.discriminatedUnion('action',[
  z.object({action:z.enum(['open','close','draw','archive','restore'])}),
  z.object({action:z.literal('video'),youtube_url:youtubeSchema}),
  z.object({action:z.literal('reset'),draw_id:z.string().uuid(),reason:z.string().trim().min(10).max(1000)}),
  z.object({action:z.literal('edit'),values:z.record(z.unknown())})
]);
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const blocked=guard(req,'admin-action');if(blocked)return blocked;
  if(!await admin())return json({error:'Sessão expirada. Entre novamente.'},401);
  try {
    const {id}=await params;
    if(!z.string().uuid().safeParse(id).success)return json({error:'Sorteio inválido.'},400);
    const p=action.safeParse(await readJsonWithLimit(req));
    if(!p.success)return json({error:'Revise os dados da operação.'},400);
    const db=getSupabaseAdmin();
    const {data:r,error:loadError}=await db.from('wz_raffles').select('id,slug,status,entry_count,archived_at').eq('id',id).maybeSingle();
    if(loadError)throw loadError;
    if(!r)return json({error:'Sorteio não encontrado.'},404);
    if(p.data.action==='archive'||p.data.action==='restore'){
      const {data,error}=await db.rpc('wz_archive_raffle',{p_raffle:id,p_archive:p.data.action==='archive'});
      if(error)throw error;
      if(!data.ok)return json({error:'Não foi possível atualizar este sorteio.'},409);
      return json(data);
    }
    if(p.data.action==='reset'){
      const {data,error}=await db.rpc('wz_invalidate_draw',{p_raffle:id,p_draw:p.data.draw_id,p_reason:p.data.reason});
      if(error)throw error;
      if(!data.ok)return json({error:'O resultado mudou ou já foi resetado. Atualize o painel.'},409);
      return json(data);
    }
    if(r.archived_at)return json({error:'Restaure o sorteio antes de realizar esta operação.'},409);
    if(p.data.action==='edit'){
      const parsed=raffleSchema.safeParse({...p.data.values,slug:r.slug});
      if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Revise os dados.'},400);
      const v=parsed.data;
      const selected=catalog.find(item=>item.id===v.prize_key)!;
      const {data,error}=await db.rpc('wz_edit_raffle',{p_raffle:id,p_values:{title:v.title,rules:v.rules,ends_at:v.ends_at,capacity:v.capacity,youtube_url:v.youtube_url,prize_key:selected.id,prize:selected.name,prize_kind:selected.kind,prize_value:v.prize_value,code_mode:v.code_mode,puzzle_parts:v.fragments.map(normalizeCode),puzzle_hash:createHash('sha256').update(normalizeCode(v.fragments.join(''))).digest('hex')}});
      if(error)throw error;
      const messages:Record<string,string>={CAPACITY:'O limite não pode ser menor que a quantidade de inscritos.',LOCKED:'Sorteios finalizados ou arquivados não podem ser editados.',DATE:'Escolha uma data futura.',NO_VIDEO:'Informe o link do vídeo do sorteio publicado.'};
      if(!data.ok)return json({error:messages[data.code]||'Não foi possível editar. Atualize o painel.'},409);
      return json(data);
    }
    if(p.data.action==='video'){
      const {data,error}=await db.from('wz_raffles').update({youtube_url:p.data.youtube_url}).eq('id',id).eq('status','draft').is('archived_at',null).select('id').maybeSingle();
      if(error)throw error;
      if(!data)return json({error:'O link só pode ser alterado no rascunho ativo.'},409);
      return json({ok:true});
    }
    if(p.data.action==='draw'){
      if(r.status!=='closed'||r.entry_count<1)return json({error:'Encerre as inscrições e tenha pelo menos um participante.'},409);
      const pool=await db.from('wz_entries').select('id',{count:'exact',head:true}).eq('raffle_id',id).is('disqualified_at',null);
      if(pool.error)throw pool.error;
      const eligible=pool.count||0;
      if(!eligible)return json({error:'Não há participantes elegíveis para um novo sorteio.'},409);
      const {data,error}=await db.rpc('wz_draw',{p_raffle:id,p_offset:randomInt(eligible),p_expected_count:eligible});
      if(error)throw error;
      if(!data.ok)return json({error:'O estado do sorteio ou o conjunto de participantes mudou. Atualize o painel.'},409);
      return json(data);
    }
    const {data,error}=await db.rpc('wz_transition',{p_raffle:id,p_action:p.data.action});
    if(error)throw error;
    if(!data.ok)return json({error:data.code==='NO_CODE'?'Configure o código do vídeo e seu link antes de publicar.':'Não é possível mudar o estado deste sorteio. Confira também a data de encerramento.'},409);
    return json(data);
  } catch(e){return failure(e)}
}
