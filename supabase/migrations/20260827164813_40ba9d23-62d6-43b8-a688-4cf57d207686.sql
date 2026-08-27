-- Storage policies
CREATE POLICY "media_admin_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "media_read_subscribers" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND (public.has_role(auth.uid(),'admin') OR public.has_active_subscription(auth.uid())));

CREATE POLICY "art_admin_write" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'catalog-art' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'catalog-art' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "art_read_authenticated" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'catalog-art');

-- Harden has_active_subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    )
  END
$function$;

-- Require explicit duration for activation codes
CREATE OR REPLACE FUNCTION public.admin_create_activation_code(_code text, _grants_days integer DEFAULT 30, _expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _note text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF _grants_days IS NULL OR _grants_days < 1 THEN
    RAISE EXCEPTION 'invalid_duration';
  END IF;
  INSERT INTO public.activation_codes (code_hash, code_last4, created_by, grants_days, expires_at, note)
  VALUES (encode(extensions.digest(norm,'sha256'),'hex'), right(norm,4), uid, _grants_days, _expires_at, _note)
  RETURNING id INTO new_id;

  INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
  VALUES (uid, NULL, 'code_created', jsonb_build_object('code_last4', right(norm,4), 'code_id', new_id, 'grants_days', _grants_days));
  RETURN new_id;
END; $function$;

-- get_episode_media already returns both; keep media_path fallback explicit
CREATE OR REPLACE FUNCTION public.get_episode_media(_episode_id uuid)
RETURNS TABLE(video_url text, media_path text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    SELECT NULLIF(e.video_url,''), NULLIF(e.media_path,'')
    FROM public.episodes e
    WHERE e.id = _episode_id AND e.published = true;
END; $function$;