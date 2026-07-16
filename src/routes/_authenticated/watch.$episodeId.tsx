import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Episode, Series } from "@/lib/types";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/watch/$episodeId")({
  component: Watch,
});

function Watch() {
  const { episodeId } = useParams({ from: "/_authenticated/watch/$episodeId" });
  const nav = useNavigate();
  const [ep, setEp] = useState<Episode | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [next, setNext] = useState<Episode | null>(null);
  const [initial, setInitial] = useState(0);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    setDecided(false);
    setSavedProgress(null);
    setInitial(0);
    (async () => {
      const { data: e } = await supabase.from("episodes").select("*").eq("id", episodeId).maybeSingle();
      if (!e) return;
      setEp(e as Episode);
      const [{ data: s }, { data: nxt }, { data: userData }] = await Promise.all([
        supabase.from("series").select("*").eq("id", (e as Episode).series_id).maybeSingle(),
        supabase.from("episodes").select("*").eq("series_id", (e as Episode).series_id).gt("episode_number", (e as Episode).episode_number).order("episode_number").limit(1).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      setSeries(s as Series | null);
      setNext(nxt as Episode | null);
      if (userData.user) {
        const { data: wp } = await supabase.from("watch_progress").select("progress_seconds").eq("user_id", userData.user.id).eq("episode_id", episodeId).maybeSingle();
        const p = wp?.progress_seconds ?? 0;
        if (p > 15) setSavedProgress(p);
        else setDecided(true);
      } else {
        setDecided(true);
      }
    })();
  }, [episodeId]);

  if (!ep || !series) return <div className="grid min-h-[60vh] place-items-center text-white/50">Loading...</div>;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      <button onClick={() => nav({ to: "/series/$id", params: { id: series.id } })} className="mb-4 inline-flex items-center gap-1 rounded-full glass px-3 py-1.5 text-xs font-medium hover:bg-white/10">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {series.title}
      </button>

      {!decided && savedProgress !== null ? (
        <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl bg-black">
          <div className="mx-4 max-w-md rounded-2xl glass-strong p-6 text-center">
            <div className="mb-1 text-xs font-semibold text-primary">EPISODE {ep.episode_number}</div>
            <h2 className="mb-2 text-xl font-bold">Continue watching?</h2>
            <p className="mb-5 text-sm text-white/60">You left off at {fmt(savedProgress)}.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => { setInitial(savedProgress); setDecided(true); }}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold shadow-[0_0_30px_rgba(59,130,246,0.4)]"
              >
                Resume from {fmt(savedProgress)}
              </button>
              <button
                onClick={() => { setInitial(0); setDecided(true); }}
                className="flex-1 rounded-lg glass px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Start from beginning
              </button>
            </div>
          </div>
        </div>
      ) : (
        <VideoPlayer
          src={ep.video_url}
          episodeId={ep.id}
          seriesId={ep.series_id}
          initialProgress={initial}
          posterUrl={ep.thumbnail_url ?? series.backdrop_url}
          onNext={next ? () => nav({ to: "/watch/$episodeId", params: { episodeId: next.id } }) : undefined}
          onEnded={() => next && nav({ to: "/watch/$episodeId", params: { episodeId: next.id } })}
        />
      )}

      <div className="mt-6 grid gap-2">
        <div className="text-xs font-semibold text-primary">EPISODE {ep.episode_number}</div>
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{ep.title}</h1>
        <p className="max-w-3xl text-sm text-white/70">{ep.synopsis}</p>
      </div>

      {next && (
        <Link to="/watch/$episodeId" params={{ episodeId: next.id }} className="mt-6 flex items-center gap-4 rounded-xl border border-white/5 bg-card p-3 transition hover:border-primary/40">
          <div className="text-xs text-white/50">Up next</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-primary">EP {next.episode_number}</div>
            <div className="text-sm font-semibold">{next.title}</div>
          </div>
        </Link>
      )}
    </div>
  );
}
