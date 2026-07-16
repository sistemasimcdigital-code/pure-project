import { Link } from "@tanstack/react-router";
import { Info, Play } from "lucide-react";
import type { Series } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";

export function HeroBanner({ series }: { series: Series }) {
  return (
    <div className="relative h-[85svh] min-h-[520px] w-full overflow-hidden sm:h-[80vh]">
      {series.backdrop_url && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={series.backdrop_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[65%_center] sm:object-center animate-ken-burns"
            draggable={false}
          />
        </div>
      )}
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/70 to-transparent sm:via-[#09090b]/50" />
      <div className="absolute inset-0 bg-[#09090b]/20 sm:bg-transparent" />

      <div className="relative flex h-full items-end px-5 pb-14 sm:items-center sm:px-12 sm:pb-0">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-medium sm:text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Featured · {TYPE_LABEL[series.type]}
          </div>
          <h1
            className="mb-3 text-[2rem] font-black leading-[1.05] tracking-tight sm:mb-4 sm:text-5xl md:text-6xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {series.title}
          </h1>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80 sm:mb-4 sm:text-sm">
            {series.rating != null && <span className="font-semibold text-primary">★ {series.rating?.toFixed(1)}</span>}
            <span>{series.year}</span>
            <span>{series.episode_count} episodes</span>
          </div>
          <p className="mb-5 line-clamp-3 max-w-xl text-sm text-white/75 sm:mb-6 sm:text-base md:text-lg">
            {series.synopsis}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/series/$id"
              params={{ id: series.id }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-primary hover:text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] sm:px-6"
            >
              <Play className="h-4 w-4 fill-current" /> Play
            </Link>
            <Link
              to="/series/$id"
              params={{ id: series.id }}
              className="inline-flex items-center gap-2 rounded-lg glass px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:px-6"
            >
              <Info className="h-4 w-4" /> More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
