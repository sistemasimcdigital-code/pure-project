import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DramaType, Series } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/types";
import { PosterCard } from "@/components/PosterCard";

export const Route = createFileRoute("/_authenticated/browse/$type")({
  component: Browse,
});

function Browse() {
  const { type } = useParams({ from: "/_authenticated/browse/$type" });
  const [list, setList] = useState<Series[]>([]);
  useEffect(() => {
    supabase.from("series").select("*").eq("type", type as DramaType).order("rating", { ascending: false })
      .then(({ data }) => setList((data as unknown as Series[]) ?? []));
  }, [type]);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-3xl font-black tracking-tight sm:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {TYPE_LABEL[type as DramaType]}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {list.map(s => <PosterCard key={s.id} series={s} />)}
      </div>
      {!list.length && <div className="py-16 text-center text-white/50">No titles here yet.</div>}
    </div>
  );
}
