import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Series } from "@/lib/types";
import { PosterCard } from "./PosterCard";

export function Carousel({ title, series }: { title: string; series: Series[] }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!series.length) return null;
  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  };
  return (
    <section className="relative py-4">
      <div className="mb-3 flex items-center justify-between px-4 sm:px-8">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        <div className="hidden gap-1 sm:flex">
          <button onClick={() => scroll(-1)} className="grid h-8 w-8 place-items-center rounded-full glass hover:bg-primary/20"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => scroll(1)} className="grid h-8 w-8 place-items-center rounded-full glass hover:bg-primary/20"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:snap-none sm:px-8"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
      >
        {series.map((s) => (
          <div key={s.id} className="snap-start">
            <PosterCard series={s} />
          </div>
        ))}
      </div>
    </section>
  );
}
