-- Wastzera: editar e arquivar sorteios preservando todos os dados.
BEGIN;
ALTER TABLE public.wz_raffles ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.wz_raffles ADD COLUMN IF NOT EXISTS archive_source text NOT NULL DEFAULT '' CHECK(archive_source IN ('','manual','completed'));

CREATE OR REPLACE FUNCTION public.wz_auto_archive_completed()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.status='drawn' AND OLD.status<>'drawn' AND NEW.archived_at IS NULL THEN
    NEW.archived_at:=now(); NEW.archive_source:='completed';
  ELSIF OLD.status='drawn' AND NEW.status='closed' AND OLD.archive_source='completed' THEN
    NEW.archived_at:=NULL; NEW.archive_source:='';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS wz_archive_completed ON public.wz_raffles;
CREATE TRIGGER wz_archive_completed BEFORE UPDATE OF status ON public.wz_raffles
FOR EACH ROW EXECUTE FUNCTION public.wz_auto_archive_completed();

-- Resultados anteriores também saem da vitrine, mantendo seus registros.
UPDATE public.wz_raffles SET archived_at=now(),archive_source='completed' WHERE status='drawn' AND archived_at IS NULL AND archive_source='';

CREATE OR REPLACE FUNCTION public.wz_archive_raffle(p_raffle uuid,p_archive boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.wz_raffles%rowtype;
BEGIN
  SELECT * INTO r FROM public.wz_raffles WHERE id=p_raffle FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
  IF p_archive THEN
    UPDATE public.wz_raffles SET archived_at=coalesce(archived_at,now()),archive_source='manual',
      status=CASE WHEN status='open' THEN 'closed' ELSE status END WHERE id=r.id;
  ELSE
    UPDATE public.wz_raffles SET archived_at=NULL,archive_source=CASE WHEN status='drawn' THEN 'completed' ELSE '' END WHERE id=r.id;
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.wz_edit_raffle(p_raffle uuid,p_values jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.wz_raffles%rowtype; target_capacity integer;
BEGIN
  SELECT * INTO r FROM public.wz_raffles WHERE id=p_raffle FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
  IF r.status='drawn' OR r.archived_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'code','LOCKED'); END IF;
  target_capacity:=(p_values->>'capacity')::integer;
  IF target_capacity IS NULL OR target_capacity<r.entry_count OR target_capacity NOT BETWEEN 1 AND 100000 THEN
    RETURN jsonb_build_object('ok',false,'code','CAPACITY');
  END IF;
  IF (p_values->>'ends_at')::timestamptz<=now() THEN RETURN jsonb_build_object('ok',false,'code','DATE'); END IF;
  IF r.status<>'draft' AND coalesce(p_values->>'youtube_url','')='' THEN
    RETURN jsonb_build_object('ok',false,'code','NO_VIDEO');
  END IF;
  UPDATE public.wz_raffles SET
    title=p_values->>'title', prize=p_values->>'prize',prize_key=p_values->>'prize_key',
    prize_kind=p_values->>'prize_kind',prize_value=(p_values->>'prize_value')::numeric,
    rules=p_values->>'rules',youtube_url=p_values->>'youtube_url',
    ends_at=(p_values->>'ends_at')::timestamptz,capacity=target_capacity,
    code_mode=p_values->>'code_mode',puzzle_hash=p_values->>'puzzle_hash',
    puzzle_parts=ARRAY(SELECT jsonb_array_elements_text(p_values->'puzzle_parts'))
  WHERE id=r.id;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.wz_transition(p_raffle uuid,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.wz_raffles%rowtype;
BEGIN
  SELECT * INTO r FROM public.wz_raffles WHERE id=p_raffle FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
  IF r.archived_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'code','ARCHIVED'); END IF;
  IF p_action='open' AND r.status='draft' AND r.ends_at>now() THEN
    IF r.puzzle_hash='' OR r.puzzle_hash IS NULL OR r.youtube_url='' THEN RETURN jsonb_build_object('ok',false,'code','NO_CODE'); END IF;
    UPDATE public.wz_raffles SET status='open' WHERE id=r.id;
  ELSIF p_action='close' AND r.status='open' THEN UPDATE public.wz_raffles SET status='closed' WHERE id=r.id;
  ELSE RETURN jsonb_build_object('ok',false,'code','INVALID_STATE'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.wz_draw(p_raffle uuid,p_offset integer,p_expected_count integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.wz_raffles%rowtype; w public.wz_entries%rowtype; n integer; h text; result public.wz_draws%rowtype;
BEGIN
  SELECT * INTO r FROM public.wz_raffles WHERE id=p_raffle FOR UPDATE;
  IF NOT FOUND OR r.status<>'closed' OR r.archived_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'code','INVALID_STATE'); END IF;
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

REVOKE ALL ON FUNCTION public.wz_archive_raffle(uuid,boolean),public.wz_edit_raffle(uuid,jsonb),public.wz_transition(uuid,text),public.wz_draw(uuid,integer,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wz_archive_raffle(uuid,boolean),public.wz_edit_raffle(uuid,jsonb),public.wz_transition(uuid,text),public.wz_draw(uuid,integer,integer) TO service_role;
COMMIT;
SELECT 'Edição e arquivamento de sorteios habilitados.' AS resultado;
