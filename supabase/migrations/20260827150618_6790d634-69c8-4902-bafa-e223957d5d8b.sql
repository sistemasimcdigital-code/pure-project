REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_episode_media(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_activation_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_create_activation_code(text, integer, timestamptz, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_subscription(uuid, public.subscription_status, timestamptz) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_activation_code(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_episode_media(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_activation_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_activation_code(text, integer, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid, public.subscription_status, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_activation_code(uuid) TO authenticated;