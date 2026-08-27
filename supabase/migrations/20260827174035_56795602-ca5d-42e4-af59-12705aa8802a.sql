-- Admins podem consultar o caminho de mídia dos episódios (coluna não legível pela API)
CREATE OR REPLACE FUNCTION public.admin_list_episode_media(_series_id uuid)
RETURNS TABLE(episode_id uuid, media_path text, video_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT e.id, NULLIF(e.media_path,''), NULLIF(e.video_url,'')
    FROM public.episodes e WHERE e.series_id = _series_id;
END; $function$;

REVOKE ALL ON FUNCTION public.admin_list_episode_media(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_episode_media(uuid) TO authenticated;

-- Admins podem definir o caminho de mídia de um episódio após o upload
CREATE OR REPLACE FUNCTION public.admin_set_episode_media(_episode_id uuid, _media_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.episodes
  SET media_path = NULLIF(_media_path,''),
      video_url = NULL,
      published = CASE WHEN NULLIF(_media_path,'') IS NULL THEN false ELSE published END
  WHERE id = _episode_id;
END; $function$;

REVOKE ALL ON FUNCTION public.admin_set_episode_media(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_episode_media(uuid, text) TO authenticated;

-- Administradores podem testar a reprodução de episódios ainda não publicados
CREATE OR REPLACE FUNCTION public.get_episode_media(_episode_id uuid)
RETURNS TABLE(video_url text, media_path text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  is_admin := public.has_role(uid,'admin');
  IF NOT (public.has_active_subscription(uid) OR is_admin) THEN
    RAISE EXCEPTION 'subscription_required';
  END IF;
  RETURN QUERY
    SELECT NULLIF(e.video_url,''), NULLIF(e.media_path,'')
    FROM public.episodes e
    WHERE e.id = _episode_id AND (e.published = true OR is_admin);
END; $function$;