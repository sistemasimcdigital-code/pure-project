import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };

  const nav_items: { label: string; to: "/home" | "/browse/$type"; params?: any }[] = [
    { label: "Home", to: "/home" },
    { label: "K-Dramas", to: "/browse/$type", params: { type: "kdrama" } },
    { label: "J-Dramas", to: "/browse/$type", params: { type: "jdrama" } },
    { label: "C-Dramas", to: "/browse/$type", params: { type: "cdrama" } },
  ];

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "glass-strong" : "bg-gradient-to-b from-black/70 to-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:px-8">
        <Link to="/home" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary shadow-[0_0_20px_rgba(59,130,246,0.6)]">
            <span className="text-sm font-black text-white">N</span>
          </div>
          <span className="hidden text-lg font-black tracking-tight sm:inline" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>NOVA</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav_items.map((n) => {
            const active = n.to === "/home" ? pathname === "/home" : pathname.startsWith("/browse/" + (n.params?.type ?? ""));
            return (
              <Link key={n.label} to={n.to} params={n.params} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "text-primary" : "text-white/70 hover:text-white"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/search" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:text-white">
            <Search className="h-4 w-4" />
          </Link>
          {isAdmin && (
            <Link to="/admin" className="hidden items-center gap-1.5 rounded-md glass px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
          <button onClick={signOut} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:text-white" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
