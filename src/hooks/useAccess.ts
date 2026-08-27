import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Subscription } from "@/lib/types";

export type AccessState = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  hasAccess: boolean;
  subscription: Subscription | null;
  refresh: () => void;
};

/**
 * Estado de acesso da conta. A decisão final é sempre do banco:
 * `has_active_subscription` (RPC) e `user_roles` com RLS.
 */
export function useAccess(): AccessState {
  const [state, setState] = useState<Omit<AccessState, "refresh">>({
    loading: true,
    userId: null,
    email: null,
    isAdmin: false,
    hasAccess: false,
    subscription: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) {
        if (!cancelled)
          setState({
            loading: false,
            userId: null,
            email: null,
            isAdmin: false,
            hasAccess: false,
            subscription: null,
          });
        return;
      }
      const [{ data: access }, { data: roles }, { data: sub }] = await Promise.all([
        supabase.rpc("has_active_subscription", { _user_id: user.id }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        isAdmin: !!roles?.some((r) => r.role === "admin"),
        hasAccess: access === true,
        subscription: (sub as unknown as Subscription | null) ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
