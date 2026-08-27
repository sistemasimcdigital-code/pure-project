import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  src: string;
  episodeId: string;
  seriesId: string;
  initialProgress?: number;
  onEnded?: () => void;
  onNext?: () => void;
  posterUrl?: string | null;
};

export function VideoPlayer({ src, episodeId, seriesId, initialProgress = 0, onEnded, onNext, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  // Load HLS if applicable
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const isHls = /\.m3u8($|\?)/i.test(src);
    if (isHls && !v.canPlayType("application/vnd.apple.mpegurl")) {
      // Dynamic import hls.js if available; fallback to direct src
      import("hls.js").then((mod) => {
        const Hls = mod.default;
        if (Hls?.isSupported()) {
          const hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(v);
          return () => hls.destroy();
        } else {
          v.src = src;
        }
      }).catch(() => { v.src = src; });
    } else {
      v.src = src;
    }
    if (initialProgress > 0) v.currentTime = initialProgress;
  }, [src, initialProgress]);

  // Save progress every 8s
  useEffect(() => {
    const iv = setInterval(async () => {
      const v = videoRef.current;
      if (!v || !playing || v.currentTime < 1) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from("watch_progress").upsert({
        user_id: userData.user.id,
        episode_id: episodeId,
        series_id: seriesId,
        progress_seconds: Math.floor(v.currentTime),
        duration_seconds: Math.floor(v.duration || 0),
        updated_at: new Date().toISOString(),
      });
    }, 8000);
    return () => clearInterval(iv);
  }, [episodeId, seriesId, playing]);

  const armHideControls = () => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current!;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const setVol = (val: number) => {
    const v = videoRef.current!;
    v.volume = val;
    setVolume(val);
    if (val > 0 && v.muted) { v.muted = false; setMuted(false); }
  };

  const setPlaybackRate = (r: number) => {
    videoRef.current!.playbackRate = r;
    setSpeed(r);
  };

  const seek = (val: number) => {
    videoRef.current!.currentTime = val;
    setTime(val);
  };

  const fs = () => {
    const el = containerRef.current!;
    if (!document.fullscreenElement) el.requestFullscreen(); else document.exitFullscreen();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onMouseMove={armHideControls}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        poster={posterUrl ?? undefined}
        className="h-full w-full"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime((e.target as HTMLVideoElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        playsInline
      />

      {/* Center play overlay */}
      {!playing && (
        <button onClick={toggle} className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-sm transition-opacity">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/90 shadow-[0_0_40px_rgba(229,9,20,0.7)]">
            <Play className="h-8 w-8 fill-white text-white" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent px-3 pb-3 pt-16 transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0"}`}>
        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#e50914] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(229,9,20,0.8)]"
          style={{ background: `linear-gradient(to right, #e50914 0%, #e50914 ${(time/(duration||1))*100}%, rgba(255,255,255,0.2) ${(time/(duration||1))*100}%)` }}
        />

        <div className="mt-2 flex items-center gap-2 text-white sm:gap-4">
          <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          <div className="flex items-center gap-1">
            <button onClick={toggleMute} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              className="hidden h-1 w-20 appearance-none rounded-full bg-white/20 accent-white sm:block"
            />
          </div>

          <span className="text-xs tabular-nums text-white/80">
            {fmt(time)} <span className="text-white/40">/ {fmt(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={speed}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="rounded-md border border-white/10 bg-black/60 px-2 py-1 text-xs backdrop-blur"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
            </select>
            {onNext && (
              <button onClick={onNext} className="inline-flex items-center gap-1 rounded-md glass px-2 py-1.5 text-xs font-medium hover:bg-primary/20">
                <SkipForward className="h-3.5 w-3.5" /> Next
              </button>
            )}
            <button onClick={fs} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
