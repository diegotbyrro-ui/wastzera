-- V0.8: preserva participantes/resultados e exige nick nos novos cadastros.
begin;
alter table public.wz_entries add column if not exists twitch_nick text not null default '';
-- O campo vazio identifica somente cadastros anteriores à atualização.
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.wz_entries'::regclass and conname='wz_entries_twitch_nick_valid') then
  alter table public.wz_entries add constraint wz_entries_twitch_nick_valid check(twitch_nick='' or twitch_nick ~ '^[a-z0-9_]{3,25}$');
 end if;
end $$;
drop function if exists public.wz_register(uuid,text,text,text,text,text);
create or replace function public.wz_register(p_raffle uuid,p_name text,p_alias text,p_email text,p_phone text,p_code_hash text,p_twitch_nick text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.wz_raffles%rowtype; c public.wz_invites%rowtype; n integer;
begin
 if p_twitch_nick is null or lower(trim(p_twitch_nick)) !~ '^[a-z0-9_]{3,25}$' then return jsonb_build_object('ok',false,'code','INVALID_NICK'); end if;
 select * into r from public.wz_raffles where id=p_raffle for update;
 if not found or r.status<>'open' or r.ends_at<=now() then return jsonb_build_object('ok',false,'code','CLOSED'); end if;
 if exists(select 1 from public.wz_entries where raffle_id=r.id and (email=lower(trim(p_email)) or phone=p_phone)) then return jsonb_build_object('ok',false,'code','DUPLICATE'); end if;
 if r.entry_count>=r.capacity then return jsonb_build_object('ok',false,'code','FULL'); end if;
 if r.puzzle_hash='' or r.puzzle_hash is null or r.puzzle_hash<>p_code_hash then return jsonb_build_object('ok',false,'code','CODE_INVALID'); end if;
 n:=r.entry_count+1;
 insert into public.wz_entries(raffle_id,ticket,name,alias,email,phone,twitch_nick,invite_id,rules_snapshot)
 values(r.id,n,p_name,p_alias,lower(trim(p_email)),p_phone,lower(trim(p_twitch_nick)),c.id,r.rules);
 update public.wz_raffles set entry_count=n where id=r.id;
 if c.id is not null then update public.wz_invites set used=used+1 where id=c.id; end if;
 return jsonb_build_object('ok',true,'ticket',n);
end; $$;

revoke all on function public.wz_register(uuid,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.wz_register(uuid,text,text,text,text,text,text) to service_role;
commit;
