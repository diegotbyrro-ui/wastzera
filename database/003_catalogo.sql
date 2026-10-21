-- V0.4: preserva cadastros e resultados; registra o item exato do catálogo.
alter table public.wz_raffles add column if not exists prize_key text not null default '';
