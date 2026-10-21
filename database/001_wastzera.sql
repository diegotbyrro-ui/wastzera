-- Execute em um NOVO projeto Supabase. Nenhuma tabela da Rocha é utilizada.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.wz_raffles (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), title text not null,
 prize text not null, description text not null, rules text not null, ends_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','open','closed','drawn')),
 require_code boolean not null default true, capacity integer not null check(capacity between 1 and 100000),
 entry_count integer not null default 0 check(entry_count>=0)
);
create table if not exists public.wz_invites (
 id uuid primary key default gen_random_uuid(), raffle_id uuid not null references public.wz_raffles(id),
 code_hash text not null, code_hint text not null, use_limit integer not null check(use_limit>0),
 used integer not null default 0, active boolean not null default true, created_at timestamptz not null default now(),
 unique(raffle_id,code_hash)
);
create table if not exists public.wz_entries (
 id uuid primary key default gen_random_uuid(), raffle_id uuid not null references public.wz_raffles(id),
 ticket integer not null, name text not null, alias text not null, email text not null, phone text not null,
 invite_id uuid references public.wz_invites(id), consent_at timestamptz not null default now(),
 rules_snapshot text not null, created_at timestamptz not null default now(),
 unique(raffle_id,ticket),unique(raffle_id,email),unique(raffle_id,phone)
);
create table if not exists public.wz_draws (
 id uuid primary key default gen_random_uuid(), raffle_id uuid not null unique references public.wz_raffles(id),
 winner_entry_id uuid not null references public.wz_entries(id), winner_alias text not null,
 winner_ticket integer not null, pool_count integer not null check(pool_count>0),
 winning_offset integer not null, pool_hash text not null, drawn_at timestamptz not null default now()
);
create index if not exists wz_entries_raffle_idx on public.wz_entries(raffle_id,ticket);
alter table public.wz_raffles enable row level security;
alter table public.wz_invites enable row level security;
alter table public.wz_entries enable row level security;
alter table public.wz_draws enable row level security;
revoke all on public.wz_raffles,public.wz_invites,public.wz_entries,public.wz_draws from public,anon,authenticated;
grant select,insert,update on public.wz_raffles,public.wz_invites to service_role;
grant select on public.wz_entries,public.wz_draws to service_role;


alter table public.wz_raffles add column if not exists prize_key text not null default '';
alter table public.wz_raffles add column if not exists puzzle_parts text[] not null default '{}';
alter table public.wz_raffles add column if not exists puzzle_hash text not null default '';
alter table public.wz_raffles add column if not exists prize_kind text not null default 'skin' check(prize_kind in ('skin','gift'));
alter table public.wz_raffles add column if not exists prize_value numeric(12,2) not null default 0 check(prize_value>=0);
alter table public.wz_raffles add column if not exists youtube_url text not null default '';
alter table public.wz_raffles add column if not exists code_mode text not null default 'words' check(code_mode in ('letters','words'));

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

-- p_offset is sampled exclusively on the backend using Node crypto.randomInt(pool_count).
-- Stable count, immutable entries and a row lock prevent a second draw and changing the pool.
create or replace function public.wz_draw(p_raffle uuid,p_offset integer,p_expected_count integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.wz_raffles%rowtype; w public.wz_entries%rowtype; n integer; h text; result public.wz_draws%rowtype;
begin
 select * into r from public.wz_raffles where id=p_raffle for update;
 if not found or r.status<>'closed' then return jsonb_build_object('ok',false,'code','INVALID_STATE'); end if;
 select count(*) into n from public.wz_entries where raffle_id=r.id;
 if n<1 or n<>p_expected_count or p_offset<0 or p_offset>=n then return jsonb_build_object('ok',false,'code','POOL_CHANGED'); end if;
 select * into w from public.wz_entries where raffle_id=r.id order by ticket offset p_offset limit 1;
 select encode(extensions.digest(string_agg(id::text,',' order by ticket),'sha256'),'hex') into h from public.wz_entries where raffle_id=r.id;
 insert into public.wz_draws(raffle_id,winner_entry_id,winner_alias,winner_ticket,pool_count,winning_offset,pool_hash)
 values(r.id,w.id,w.alias,w.ticket,n,p_offset,h) returning * into result;
 update public.wz_raffles set status='drawn' where id=r.id;
 return jsonb_build_object('ok',true,'draw_id',result.id,'winner_alias',w.alias,'winner_ticket',w.ticket);
end; $$;
revoke all on function public.wz_register(uuid,text,text,text,text,text),public.wz_transition(uuid,text),public.wz_draw(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.wz_register(uuid,text,text,text,text,text),public.wz_transition(uuid,text),public.wz_draw(uuid,integer,integer) to service_role;
