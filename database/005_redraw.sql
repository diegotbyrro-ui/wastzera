-- Execute uma vez no SQL Editor do Supabase antes de publicar a atualização.
BEGIN;
ALTER TABLE public.wz_entries ADD COLUMN IF NOT EXISTS disqualified_at timestamptz;
ALTER TABLE public.wz_entries ADD COLUMN IF NOT EXISTS disqualification_reason text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.wz_draw_invalidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES public.wz_raffles(id),
  original_draw_id uuid NOT NULL UNIQUE,
  original_draw jsonb NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) BETWEEN 10 AND 1000),
  invalidated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wz_draw_invalidations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wz_draw_invalidations FROM public, anon, authenticated;
GRANT SELECT ON public.wz_draw_invalidations TO service_role;

CREATE OR REPLACE FUNCTION public.wz_invalidate_draw(p_raffle uuid,p_draw uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.wz_raffles%rowtype; d public.wz_draws%rowtype;
BEGIN
  IF p_reason IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RETURN jsonb_build_object('ok',false,'code','INVALID_REASON');
  END IF;
  SELECT * INTO r FROM public.wz_raffles WHERE id=p_raffle FOR UPDATE;
  IF NOT FOUND OR r.status<>'drawn' THEN RETURN jsonb_build_object('ok',false,'code','INVALID_STATE'); END IF;
  SELECT * INTO d FROM public.wz_draws WHERE raffle_id=r.id;
  IF NOT FOUND OR p_draw IS NULL OR d.id<>p_draw THEN RETURN jsonb_build_object('ok',false,'code','STALE_RESULT'); END IF;
  INSERT INTO public.wz_draw_invalidations(raffle_id,original_draw_id,original_draw,reason)
    VALUES(r.id,d.id,to_jsonb(d),trim(p_reason));
  UPDATE public.wz_entries SET disqualified_at=now(),disqualification_reason=trim(p_reason) WHERE id=d.winner_entry_id;
  DELETE FROM public.wz_draws WHERE id=d.id;
  UPDATE public.wz_raffles SET status='closed' WHERE id=r.id;
  RETURN jsonb_build_object('ok',true,'excluded_ticket',d.winner_ticket);
END $$;

CREATE OR REPLACE FUNCTION public.wz_draw(p_raffle uuid,p_offset integer,p_expected_count integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.wz_raffles%rowtype; w public.wz_entries%rowtype; n integer; h text; result public.wz_draws%rowtype;
BEGIN
  SELECT * INTO r FROM public.wz_raffles WHERE id=p_raffle FOR UPDATE;
  IF NOT FOUND OR r.status<>'closed' THEN RETURN jsonb_build_object('ok',false,'code','INVALID_STATE'); END IF;
  SELECT count(*) INTO n FROM public.wz_entries WHERE raffle_id=r.id AND disqualified_at IS NULL;
  IF n<1 OR p_expected_count IS NULL OR p_offset IS NULL OR n<>p_expected_count OR p_offset<0 OR p_offset>=n THEN
    RETURN jsonb_build_object('ok',false,'code','POOL_CHANGED');
  END IF;
  SELECT * INTO w FROM public.wz_entries WHERE raffle_id=r.id AND disqualified_at IS NULL ORDER BY ticket OFFSET p_offset LIMIT 1;
  SELECT encode(extensions.digest(string_agg(id::text,',' ORDER BY ticket),'sha256'),'hex') INTO h
    FROM public.wz_entries WHERE raffle_id=r.id AND disqualified_at IS NULL;
  INSERT INTO public.wz_draws(raffle_id,winner_entry_id,winner_alias,winner_ticket,pool_count,winning_offset,pool_hash)
    VALUES(r.id,w.id,w.alias,w.ticket,n,p_offset,h) RETURNING * INTO result;
  UPDATE public.wz_raffles SET status='drawn' WHERE id=r.id;
  RETURN jsonb_build_object('ok',true,'draw_id',result.id,'winner_alias',w.alias,'winner_ticket',w.ticket);
END $$;

REVOKE ALL ON FUNCTION public.wz_invalidate_draw(uuid,uuid,text),public.wz_draw(uuid,integer,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wz_invalidate_draw(uuid,uuid,text),public.wz_draw(uuid,integer,integer) TO service_role;
COMMIT;
SELECT 'Atualização da roleta e histórico concluída.' AS resultado;
