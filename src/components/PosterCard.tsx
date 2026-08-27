import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { Series } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { useSignedCatalogImage } from "@/hooks/useSignedCatalogImage";

export function PosterCard({ series }: { series: Series }) {
  const poster = useSignedCatalogImage(series.poster_url);
  return (
    <Link
      to="/series/$id"
      params={{ id: series.id }}
      className="group relative block w-40 sm:w-48 md:w-52 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-card transition-all duration-300 hover:scale-[1.04] hover:border-primary/40 hover:shadow-[0_20px_40px_-10px_rgba(229,9,20,0.35)]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {poster.url && (
          <img
            src={poster.url}
            alt={series.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <div className="w-fit rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary backdrop-blur">
            {TYPE_LABEL[series.type]}
          </div>
          {series.is_dubbed && (
            <div className="w-fit rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-bold tracking-tight text-primary backdrop-blur border border-primary/30">
              DUBLADO
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-white">{series.title}</h3>
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
            <span>{series.episode_count} ep · {series.year}</span>
            <span className="text-primary">★ {series.rating?.toFixed(1)}</span>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/90 shadow-[0_0_30px_rgba(229,9,20,0.6)]">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
