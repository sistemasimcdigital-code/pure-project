import { Link } from "@tanstack/react-router";
import { Info, Play } from "lucide-react";
import type { Series } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";

export function HeroBanner({ series }: { series: Series }) {
  return (
    <div className="relative h-[70vh] min-h-[520px] w-full overflow-hidden">
      {series.backdrop_url && (
        <img src={series.backdrop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/60 to-transparent" />
      <div className="relative flex h-full items-end px-4 pb-16 sm:items-center sm:px-12 sm:pb-0">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Featured · {TYPE_LABEL[series.type]}
          </div>
          <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight sm:text-6xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {series.title}
          </h1>
          <div className="mb-4 flex items-center gap-4 text-sm text-white/80">
            <span className="text-primary font-semibold">★ {series.rating?.toFixed(1)}</span>
            <span>{series.year}</span>
            <span>{series.episode_count} episodes</span>
          </div>
          <p className="mb-6 line-clamp-3 max-w-xl text-base text-white/80 sm:text-lg">{series.synopsis}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/series/$id"
              params={{ id: series.id }}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-primary hover:text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"
            >
              <Play className="h-4 w-4 fill-current" /> Play
            </Link>
            <Link
              to="/series/$id"
              params={{ id: series.id }}
              className="inline-flex items-center gap-2 rounded-lg glass px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              <Info className="h-4 w-4" /> More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
