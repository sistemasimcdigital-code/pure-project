import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Series } from "@/lib/types";
import { PosterCard } from "@/components/PosterCard";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Series[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const query = supabase.from("series").select("*");
      const { data } = q ? await query.ilike("title", `%${q}%`) : await query.limit(20);
      setList((data as unknown as Series[]) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <div className="mb-8 flex items-center gap-3 rounded-2xl glass-strong px-4 py-3">
        <SearchIcon className="h-5 w-5 text-white/40" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search dramas..."
          className="w-full bg-transparent text-base outline-none placeholder:text-white/40" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {list.map(s => <PosterCard key={s.id} series={s} />)}
      </div>
    </div>
  );
}
