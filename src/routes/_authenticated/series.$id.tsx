import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Episode, Season, Series, WatchProgress } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { ArrowLeft, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/series/$id")({
  component: SeriesDetail,
});

function SeriesDetail() {
  const { id } = useParams({ from: "/_authenticated/series/$id" });
  const nav = useNavigate();
  const [series, setSeries] = useState<Series | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeSeason, setActiveSeason] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, WatchProgress>>({});

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: ss }, { data: eps }] = await Promise.all([
        supabase.from("series").select("*").eq("id", id).maybeSingle(),
        supabase.from("seasons").select("*").eq("series_id", id).order("season_number"),
        supabase.from("episodes").select("*").eq("series_id", id).order("episode_number"),
      ]);
      setSeries(s as Series | null);
      setSeasons((ss as Season[]) ?? []);
      setEpisodes((eps as Episode[]) ?? []);
      if (ss?.[0]) setActiveSeason(ss[0].id);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: wp } = await supabase.from("watch_progress")
          .select("*").eq("user_id", userData.user.id).eq("series_id", id);
        const map: Record<string, WatchProgress> = {};
        (wp as WatchProgress[] ?? []).forEach(w => { map[w.episode_id] = w; });
        setProgress(map);
      }
    })();
  }, [id]);

  if (!series) return <div className="grid min-h-[60vh] place-items-center text-white/50">Loading...</div>;

  const visibleEps = episodes.filter(e => e.season_id === activeSeason);
  const firstEp = episodes[0];

  return (
    <div>
      <div className="relative h-[50vh] min-h-[380px] w-full overflow-hidden -mt-16">
        {series.backdrop_url && <img src={series.backdrop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-[#09090b]/30" />
        <button onClick={() => nav({ to: "/home" })} className="absolute left-4 top-20 inline-flex items-center gap-1 rounded-full glass px-3 py-1.5 text-xs font-medium hover:bg-white/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </div>
      <div className="mx-auto -mt-40 max-w-6xl px-4 pb-16 sm:px-8">
        <div className="rounded-2xl glass-strong p-6 sm:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {TYPE_LABEL[series.type]}
          </div>
          <h1 className="mb-3 text-3xl font-black tracking-tight sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{series.title}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="text-primary font-semibold">★ {series.rating?.toFixed(1)}</span>
            <span>{series.year}</span>
            <span>{series.episode_count} episodes</span>
          </div>
          <p className="mb-6 max-w-3xl text-white/80">{series.synopsis}</p>
          <div className="flex flex-wrap gap-3">
            {firstEp && (
              <Link to="/watch/$episodeId" params={{ episodeId: firstEp.id }}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-primary hover:text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                <Play className="h-4 w-4 fill-current" /> Play S1E1
              </Link>
            )}
          </div>
        </div>

        {/* Episodes */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2 border-b border-white/10">
            {seasons.map(s => (
              <button key={s.id} onClick={() => setActiveSeason(s.id)}
                className={`relative px-4 py-3 text-sm font-semibold transition-colors ${activeSeason === s.id ? "text-primary" : "text-white/60 hover:text-white"}`}>
                {s.title ?? `Season ${s.season_number}`}
                {activeSeason === s.id && <div className="absolute inset-x-0 -bottom-px h-0.5 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.7)]" />}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleEps.map(ep => {
              const p = progress[ep.id];
              const pct = p?.duration_seconds ? Math.min(100, (p.progress_seconds / p.duration_seconds) * 100) : 0;
              return (
                <Link key={ep.id} to="/watch/$episodeId" params={{ episodeId: ep.id }}
                  className="group flex gap-4 rounded-xl border border-white/5 bg-card/60 p-3 transition-all hover:border-primary/40 hover:bg-card">
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-40">
                    {ep.thumbnail_url && <img src={ep.thumbnail_url} alt="" className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="h-6 w-6 fill-white text-white" />
                    </div>
                    {pct > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-primary">EP {ep.episode_number}</span>
                      <h3 className="truncate text-sm font-semibold">{ep.title}</h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-white/60">{ep.synopsis}</p>
                    {ep.duration_seconds && <p className="mt-1 text-[11px] text-white/40">{Math.floor(ep.duration_seconds/60)} min</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
