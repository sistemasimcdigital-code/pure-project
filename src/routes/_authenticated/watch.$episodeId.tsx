import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Episode, Series } from "@/lib/types";
import { EPISODE_COLUMNS } from "@/lib/types";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/watch/$episodeId")({
  component: Watch,
});

type Gate = "loading" | "blocked" | "unavailable" | "error" | "ready";

function Watch() {
  const { episodeId } = useParams({ from: "/_authenticated/watch/$episodeId" });
  const nav = useNavigate();
  const [ep, setEp] = useState<Episode | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [next, setNext] = useState<Episode | null>(null);
  const [initial, setInitial] = useState(0);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [decided, setDecided] = useState(false);
  const [gate, setGate] = useState<Gate>("loading");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    setDecided(false);
    setSavedProgress(null);
    setInitial(0);
    setGate("loading");
    setMediaUrl(null);
    (async () => {
      const { data: e } = await supabase
        .from("episodes")
        .select(EPISODE_COLUMNS)
        .eq("id", episodeId)
        .maybeSingle();
      if (!e) {
        setGate("unavailable");
        return;
      }
      const episode = e as unknown as Episode;
      setEp(episode);

      const [{ data: s }, { data: nxt }, { data: userData }] = await Promise.all([
        supabase.from("series").select("*").eq("id", episode.series_id).maybeSingle(),
        supabase
          .from("episodes")
          .select(EPISODE_COLUMNS)
          .eq("series_id", episode.series_id)
          .gt("episode_number", episode.episode_number)
          .order("episode_number")
          .limit(1)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);
      setSeries((s as unknown as Series | null) ?? null);
      setNext((nxt as unknown as Episode | null) ?? null);

      // A URL protegida só é solicitada ao banco; o frontend não decide o acesso.
      const { data: media, error: mediaError } = await supabase.rpc("get_episode_media", {
        _episode_id: episodeId,
      });
      if (mediaError) {
        setGate(/subscription_required/.test(mediaError.message) ? "blocked" : "error");
        return;
      }
      const row = (media as { video_url: string | null; media_path: string | null }[] | null)?.[0];
      if (!row?.video_url && !row?.media_path) {
        setGate("unavailable");
        return;
      }
      if (row.video_url) {
        setMediaUrl(row.video_url);
      } else {
        const { data: signed, error: signError } = await supabase.storage
          .from("media")
          .createSignedUrl(row.media_path!, 60 * 60);
        if (signError || !signed?.signedUrl) {
          setGate("error");
          return;
        }
        setMediaUrl(signed.signedUrl);
      }
      setGate("ready");

      if (userData.user) {
        const { data: wp } = await supabase
          .from("watch_progress")
          .select("progress_seconds")
          .eq("user_id", userData.user.id)
          .eq("episode_id", episodeId)
          .maybeSingle();
        const p = wp?.progress_seconds ?? 0;
        if (p > 15) setSavedProgress(p);
        else setDecided(true);
      } else {
        setDecided(true);
      }
    })();
  }, [episodeId]);

  if (gate === "loading") {
    return <div className="grid min-h-[60vh] place-items-center text-white/50">Carregando…</div>;
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      {series && (
        <button
          onClick={() => nav({ to: "/series/$id", params: { id: series.id } })}
          className="mb-4 inline-flex items-center gap-1 rounded-full glass px-3 py-1.5 text-xs font-medium hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para {series.title}
        </button>
      )}

      {gate === "blocked" && (
        <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl bg-black">
          <div className="mx-4 max-w-md rounded-2xl glass-strong p-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">Conteúdo para assinantes autorizados</h2>
            <p className="mt-2 text-sm text-white/60">
              Seu acesso não está ativo. A Doramaflix não cobra assinatura: o acesso é liberado a assinantes
              autorizados externamente por meio de um código de ativação.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/activate"
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold shadow-[0_0_30px_rgba(229,9,20,0.4)]"
              >
                Ativar acesso
              </Link>
              <Link to="/account" className="flex-1 rounded-lg glass px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
                Ver minha conta
              </Link>
            </div>
          </div>
        </div>
      )}

      {gate === "unavailable" && (
        <div className="grid aspect-video w-full place-items-center rounded-xl bg-black text-center text-sm text-white/60">
          <p className="mx-6">
            Este episódio ainda não possui mídia licenciada publicada. Fale com o administrador do catálogo.
          </p>
        </div>
      )}

      {gate === "error" && (
        <div className="grid aspect-video w-full place-items-center rounded-xl bg-black text-center text-sm text-destructive">
          <p className="mx-6">Não foi possível carregar o vídeo agora. Verifique sua conexão e tente novamente.</p>
        </div>
      )}

      {gate === "ready" && ep && mediaUrl && (
        !decided && savedProgress !== null ? (
          <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl bg-black">
            <div className="mx-4 max-w-md rounded-2xl glass-strong p-6 text-center">
              <div className="mb-1 text-xs font-semibold text-primary">EPISÓDIO {ep.episode_number}</div>
              <h2 className="mb-2 text-xl font-bold">Continuar assistindo?</h2>
              <p className="mb-5 text-sm text-white/60">Você parou em {fmt(savedProgress)}.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => {
                    setInitial(savedProgress);
                    setDecided(true);
                  }}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold shadow-[0_0_30px_rgba(229,9,20,0.4)]"
                >
                  Retomar em {fmt(savedProgress)}
                </button>
                <button
                  onClick={() => {
                    setInitial(0);
                    setDecided(true);
                  }}
                  className="flex-1 rounded-lg glass px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
                >
                  Começar do início
                </button>
              </div>
            </div>
          </div>
        ) : (
          <VideoPlayer
            src={mediaUrl}
            episodeId={ep.id}
            seriesId={ep.series_id}
            initialProgress={initial}
            posterUrl={ep.thumbnail_url ?? series?.backdrop_url ?? null}
            onNext={next ? () => nav({ to: "/watch/$episodeId", params: { episodeId: next.id } }) : undefined}
            onEnded={() => next && nav({ to: "/watch/$episodeId", params: { episodeId: next.id } })}
          />
        )
      )}

      {ep && (
        <div className="mt-6 grid gap-2">
          <div className="text-xs font-semibold text-primary">EPISÓDIO {ep.episode_number}</div>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {ep.title}
          </h1>
          <p className="max-w-3xl text-sm text-white/70">{ep.synopsis}</p>
        </div>
      )}

      {next && gate === "ready" && (
        <Link
          to="/watch/$episodeId"
          params={{ episodeId: next.id }}
          className="mt-6 flex items-center gap-4 rounded-xl border border-white/5 bg-card p-3 transition hover:border-primary/40"
        >
          <div className="text-xs text-white/50">A seguir</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-primary">EP {next.episode_number}</div>
            <div className="text-sm font-semibold">{next.title}</div>
          </div>
        </Link>
      )}
    </div>
  );
}
