-- Atualização da V0.1 para V0.2; preserva participantes e resultados.
begin;

alter table public.wz_raffles add column if not exists puzzle_parts text[] not null default '{}';
alter table public.wz_raffles add column if not exists puzzle_hash text not null default '';
alter table public.wz_raffles add column if not exists prize_kind text not null default 'skin' check(prize_kind in ('skin','gift'));
alter table public.wz_raffles add column if not exists prize_value numeric(12,2) not null default 0 check(prize_value>=0);
alter table public.wz_raffles add column if not exists youtube_url text not null default '';
alter table public.wz_raffles add column if not exists code_mode text not null default 'words' check(code_mode in ('letters','words'));

do $$ begin
 if exists(select 1 from public.wz_raffles where status='open' and puzzle_hash='') then
  raise exception 'Existem campanhas V0.1 abertas. Encerre-as na instalação anterior antes de atualizar.';
 end if;
end $$;

create or replace function public.wz_register(p_raffle uuid,p_name text,p_alias text,p_email text,p_phone text,p_code_hash text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.wz_raffles%rowtype; c public.wz_invites%rowtype; n integer;
begin
 select * into r from public.wz_raffles where id=p_raffle for update;
 if not found or r.status<>'open' or r.ends_at<=now() then return jsonb_build_object('ok',false,'code','CLOSED'); end if;
 if exists(select 1 from public.wz_entries where raffle_id=r.id and (email=lower(trim(p_email)) or phone=p_phone)) then return jsonb_build_object('ok',false,'code','DUPLICATE'); end if;
 if r.entry_count>=r.capacity then return jsonb_build_object('ok',false,'code','FULL'); end if;
 if r.puzzle_hash='' or r.puzzle_hash is null or r.puzzle_hash<>p_code_hash then return jsonb_build_object('ok',false,'code','CODE_INVALID'); end if;
 n:=r.entry_count+1;
 insert into public.wz_entries(raffle_id,ticket,name,alias,email,phone,invite_id,rules_snapshot)
 values(r.id,n,p_name,p_alias,lower(trim(p_email)),p_phone,c.id,r.rules);
 update public.wz_raffles set entry_count=n where id=r.id;
 if c.id is not null then update public.wz_invites set used=used+1 where id=c.id; end if;
 return jsonb_build_object('ok',true,'ticket',n);
end; $$;

-- State transition is locked against registrations; no reopening a frozen participant pool.
create or replace function public.wz_transition(p_raffle uuid,p_action text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.wz_raffles%rowtype;
begin
 select * into r from public.wz_raffles where id=p_raffle for update;
 if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
 if p_action='open' and r.status='draft' and r.ends_at>now() then
  if r.puzzle_hash='' or r.puzzle_hash is null or r.youtube_url='' then return jsonb_build_object('ok',false,'code','NO_CODE'); end if;
  update public.wz_raffles set status='open' where id=r.id;
 elsif p_action='close' and r.status='open' then update public.wz_raffles set status='closed' where id=r.id;
 else return jsonb_build_object('ok',false,'code','INVALID_STATE'); end if;
 return jsonb_build_object('ok',true);
end; $$;


commit;
