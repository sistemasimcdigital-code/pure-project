CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.subscription_status AS ENUM ('active','suspended','expired','cancelled');
CREATE TYPE public.subscription_source AS ENUM ('facebook_manual','external_manual','activation_code');
CREATE TYPE public.activation_code_status AS ENUM ('available','redeemed','revoked','expired');

-- =========================
-- subscriptions
-- =========================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'active',
  source public.subscription_source NOT NULL DEFAULT 'external_manual',
  external_reference text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY subscriptions_admin_all ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE UNIQUE INDEX subscriptions_one_active_per_user ON public.subscriptions (user_id) WHERE status = 'active';
CREATE INDEX subscriptions_user_id_idx ON public.subscriptions (user_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX subscriptions_expires_at_idx ON public.subscriptions (expires_at);

-- =========================
-- activation_codes
-- =========================
CREATE TABLE public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  code_last4 text NOT NULL,
  status public.activation_code_status NOT NULL DEFAULT 'available',
  note text,
  grants_days integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  expires_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.activation_codes TO authenticated;
GRANT ALL ON public.activation_codes TO service_role;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY activation_codes_admin_all ON public.activation_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX activation_codes_status_idx ON public.activation_codes (status);
CREATE INDEX activation_codes_redeemed_by_idx ON public.activation_codes (redeemed_by);

-- =========================
-- audit log
-- =========================
CREATE TABLE public.subscription_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_audit_log TO authenticated;
GRANT ALL ON public.subscription_audit_log TO service_role;
ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_admin_select ON public.subscription_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX subscription_audit_target_idx ON public.subscription_audit_log (target_user_id, created_at DESC);

-- =========================
-- updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- catalog production fields
-- =========================
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_rating text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS subtitle_languages text[],
  ADD COLUMN IF NOT EXISTS license_note text,
  ADD COLUMN IF NOT EXISTS is_sample_data boolean NOT NULL DEFAULT false;

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS subtitle_languages text[],
  ADD COLUMN IF NOT EXISTS license_note text;

ALTER TABLE public.episodes ALTER COLUMN video_url DROP NOT NULL;

-- remove demo media + third-party brand from sample rows
UPDATE public.episodes SET video_url = NULL
WHERE video_url ILIKE '%BigBuckBunny%' OR video_url ILIKE '%ElephantsDream%' OR video_url ILIKE '%commondatastorage.googleapis.com%';
UPDATE public.series SET source_platform = NULL WHERE source_platform IS NOT NULL;
UPDATE public.series SET is_sample_data = true, license_note = 'Dados de exemplo — substituir por catálogo licenciado';

-- =========================
-- protect video_url / media_path at column level
-- =========================
DROP POLICY IF EXISTS episodes_read_all ON public.episodes;
CREATE POLICY episodes_read_published ON public.episodes FOR SELECT TO anon, authenticated USING (published = true);

REVOKE SELECT ON public.episodes FROM anon;
REVOKE SELECT ON public.episodes FROM authenticated;
GRANT SELECT (id, season_id, series_id, episode_number, title, synopsis, duration_seconds, thumbnail_url, created_at, published, is_premium, language, subtitle_languages, license_note)
  ON public.episodes TO anon, authenticated;

DROP POLICY IF EXISTS series_read_all ON public.series;
CREATE POLICY series_read_published ON public.series FOR SELECT TO anon, authenticated USING (published = true);

-- =========================
-- authorization helpers
-- =========================
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;

-- protected media resolver: only for active subscribers (or admins)
CREATE OR REPLACE FUNCTION public.get_episode_media(_episode_id uuid)
RETURNS TABLE (video_url text, media_path text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_active_subscription(uid) OR public.has_role(uid,'admin')) THEN
    RAISE EXCEPTION 'subscription_required';
  END IF;
  RETURN QUERY
    SELECT e.video_url, e.media_path
    FROM public.episodes e
    WHERE e.id = _episode_id AND e.published = true;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_episode_media(uuid) TO authenticated;

-- =========================
-- activation code redemption
-- =========================
CREATE OR REPLACE FUNCTION public.redeem_activation_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  norm text := upper(regexp_replace(coalesce(_code,''), '[^a-zA-Z0-9]', '', 'g'));
  hash text;
  rec public.activation_codes;
  recent_fails int;
  new_expires timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
  END IF;
  IF length(norm) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT count(*) INTO recent_fails FROM public.subscription_audit_log
  WHERE target_user_id = uid AND action = 'code_redeem_failed' AND created_at > now() - interval '15 minutes';
  IF recent_fails >= 8 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  IF public.has_active_subscription(uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_active');
  END IF;

  hash := encode(extensions.digest(norm, 'sha256'), 'hex');

  SELECT * INTO rec FROM public.activation_codes WHERE code_hash = hash FOR UPDATE;

  IF rec.id IS NULL THEN
    INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
    VALUES (uid, uid, 'code_redeem_failed', jsonb_build_object('reason','invalid'));
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF rec.status = 'redeemed' THEN
    INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
    VALUES (uid, uid, 'code_redeem_failed', jsonb_build_object('reason','redeemed'));
    RETURN jsonb_build_object('ok', false, 'reason', 'redeemed');
  END IF;
  IF rec.status = 'revoked' THEN
    INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
    VALUES (uid, uid, 'code_redeem_failed', jsonb_build_object('reason','revoked'));
    RETURN jsonb_build_object('ok', false, 'reason', 'revoked');
  END IF;
  IF rec.expires_at IS NOT NULL AND rec.expires_at <= now() THEN
    UPDATE public.activation_codes SET status = 'expired' WHERE id = rec.id;
    INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
    VALUES (uid, uid, 'code_redeem_failed', jsonb_build_object('reason','expired'));
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  UPDATE public.activation_codes
  SET status = 'redeemed', redeemed_by = uid, redeemed_at = now()
  WHERE id = rec.id;

  IF rec.grants_days IS NOT NULL THEN
    new_expires := now() + make_interval(days => rec.grants_days);
  END IF;

  UPDATE public.subscriptions SET status = 'expired' WHERE user_id = uid AND status = 'active';

  INSERT INTO public.subscriptions (user_id, status, source, started_at, expires_at)
  VALUES (uid, 'active', 'activation_code', now(), new_expires);

  INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
  VALUES (uid, uid, 'code_redeemed', jsonb_build_object('code_last4', rec.code_last4, 'expires_at', new_expires));

  RETURN jsonb_build_object('ok', true, 'expires_at', new_expires);
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_activation_code(text) TO authenticated;

-- =========================
-- admin actions
-- =========================
CREATE OR REPLACE FUNCTION public.admin_create_activation_code(_code text, _grants_days integer DEFAULT NULL, _expires_at timestamptz DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  norm text := upper(regexp_replace(coalesce(_code,''), '[^a-zA-Z0-9]', '', 'g'));
  new_id uuid;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF length(norm) < 8 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;
  INSERT INTO public.activation_codes (code_hash, code_last4, created_by, grants_days, expires_at, note)
  VALUES (encode(extensions.digest(norm,'sha256'),'hex'), right(norm,4), uid, _grants_days, _expires_at, _note)
  RETURNING id INTO new_id;

  INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
  VALUES (uid, NULL, 'code_created', jsonb_build_object('code_last4', right(norm,4), 'code_id', new_id));
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_create_activation_code(text, integer, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_subscription(_user_id uuid, _status public.subscription_status, _expires_at timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _status = 'active' THEN
    UPDATE public.subscriptions SET status = 'cancelled', cancelled_at = now() WHERE user_id = _user_id AND status = 'active';
    INSERT INTO public.subscriptions (user_id, status, source, started_at, expires_at)
    VALUES (_user_id, 'active', 'external_manual', now(), _expires_at);
  ELSE
    UPDATE public.subscriptions
    SET status = _status,
        expires_at = COALESCE(_expires_at, expires_at),
        cancelled_at = CASE WHEN _status = 'cancelled' THEN now() ELSE cancelled_at END
    WHERE user_id = _user_id AND status = 'active';
  END IF;

  INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
  VALUES (uid, _user_id, 'subscription_' || _status::text, jsonb_build_object('expires_at', _expires_at));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid, public.subscription_status, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_activation_code(_code_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.activation_codes SET status = 'revoked' WHERE id = _code_id AND status = 'available';
  INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
  VALUES (uid, NULL, 'code_revoked', jsonb_build_object('code_id', _code_id));
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_revoke_activation_code(uuid) TO authenticated;

-- role management: only existing admins, no self-elevation
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin') AND user_id <> auth.uid());
CREATE POLICY user_roles_admin_select ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));