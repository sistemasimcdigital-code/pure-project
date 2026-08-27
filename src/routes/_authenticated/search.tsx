import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Series } from "@/lib/types";
import { PosterCard } from "@/components/PosterCard";
import { ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Buscar títulos — Nova" },
      { name: "description", content: "Busque doramas coreanos, japoneses e chineses no catálogo da Nova." },
      { property: "og:title", content: "Buscar títulos — Nova" },
      { property: "og:description", content: "Encontre séries asiáticas licenciadas no catálogo da Nova." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Series[]>([]);
  const [state, setState] = useState<"loading" | "error" | "idle">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const t = setTimeout(async () => {
      const term = q.trim();
      let query = supabase.from("series").select("*").eq("published", true).limit(48);
      if (term) query = query.or(`title.ilike.%${term}%,synopsis.ilike.%${term}%`);
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setState("error");
        return;
      }
      setList((data as unknown as Series[]) ?? []);
      setState("idle");
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <Link to="/home" className="mb-4 inline-flex items-center gap-1 rounded-full glass px-3 py-1.5 text-xs font-medium hover:bg-white/10">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao catálogo
      </Link>

      <div className="mb-8 flex items-center gap-3 rounded-2xl glass-strong px-4 py-3">
        <SearchIcon className="h-5 w-5 text-white/40" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título ou sinopse…"
          className="w-full bg-transparent text-base outline-none placeholder:text-white/40"
        />
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>

      {state === "error" && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro de conexão ao buscar títulos. Verifique sua internet e tente novamente.
        </p>
      )}

      {state === "idle" && list.length === 0 && (
        <div className="py-16 text-center text-sm text-white/50">
          <p className="font-semibold text-white/70">Nenhum título encontrado</p>
          <p className="mt-1">Tente outro termo ou volte ao catálogo completo.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {list.map((s) => (
          <PosterCard key={s.id} series={s} />
        ))}
      </div>
    </div>
  );
}
