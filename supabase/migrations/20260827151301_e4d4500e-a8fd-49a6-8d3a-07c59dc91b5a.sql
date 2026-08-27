INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'igormoises.ads@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subscription_audit_log (actor_id, target_user_id, action, metadata)
SELECT id, id, 'admin_role_granted', jsonb_build_object('via','migration')
FROM auth.users WHERE lower(email) = 'igormoises.ads@gmail.com';