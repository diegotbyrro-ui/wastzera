export type Raffle = {id:string;slug:string;title:string;prize:string;description:string;rules:string;ends_at:string;status:'draft'|'open'|'closed'|'drawn';require_code:boolean;prize_key?:string;prize_kind:'skin'|'gift';prize_value:number;youtube_url:string;code_mode:'letters'|'words';capacity:number;entry_count:number};
export type Draw = {id:string;raffle_id:string;winner_alias:string;winner_ticket:number;pool_count:number;pool_hash:string;drawn_at:string};
export const demoRaffles:Raffle[]=[
{id:'demo-1',slug:'drop-da-comunidade',title:'Encontre o código. Entre no drop.',prize:'AK-47 | Redline',description:'Quatro palavras estão escondidas no vídeo. Encontre as pistas, junte o código e libere sua participação.',rules:'Exemplo de apresentação. Nenhuma inscrição está sendo coletada.',ends_at:'',status:'draft',require_code:true,prize_kind:'skin',prize_value:0,youtube_url:'',code_mode:'words',capacity:500,entry_count:0},
{id:'demo-2',slug:'especial-da-live',title:'Quatro pistas. Uma participação.',prize:'GIFT CARD',description:'Assista ao vídeo, encontre as quatro letras espelhadas e monte o código na ordem em que aparecem.',rules:'Exemplo de apresentação.',ends_at:'',status:'draft',require_code:true,prize_kind:'gift',prize_value:100,youtube_url:'',code_mode:'letters',capacity:500,entry_count:0}];
export function configured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
export function dateLabel(value:string){return value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'}):'Em breve'}
export const statusLabel={draft:'Em breve',open:'Inscrições abertas',closed:'Inscrições encerradas',drawn:'Resultado disponível'};

export const publicRaffleFields="id,slug,title,prize,description,rules,ends_at,status,require_code,capacity,entry_count,prize_kind,prize_value,youtube_url,code_mode,prize_key";

