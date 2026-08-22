import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Series } from "@/lib/types";
import { HeroBanner } from "@/components/HeroBanner";
import { Carousel } from "@/components/Carousel";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Nova" }] }),
  component: Home,
});

function Home() {
  const [series, setSeries] = useState<Series[]>([]);
  const [continueWatching, setContinueWatching] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("series").select("*").order("created_at", { ascending: false });
      setSeries((data as Series[]) ?? []);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: wp } = await supabase.from("watch_progress")
          .select("series_id, updated_at")
          .eq("user_id", userData.user.id)
          .order("updated_at", { ascending: false })
          .limit(10);
        const seriesIds = [...new Set((wp ?? []).map((w: any) => w.series_id))];
        if (seriesIds.length) {
          const { data: cw } = await supabase.from("series").select("*").in("id", seriesIds);
          const map = new Map((cw as Series[] ?? []).map(s => [s.id, s]));
          setContinueWatching(seriesIds.map(id => map.get(id)!).filter(Boolean));
        }
      }
      setLoading(false);
    })();
  }, []);

  const featured = series.find(s => s.featured) ?? series[0];
  const k = series.filter(s => s.type === "kdrama");
  const j = series.filter(s => s.type === "jdrama");
  const c = series.filter(s => s.type === "cdrama");
  const netflixDubbed = series.filter(s => s.source_platform?.toLowerCase() === 'netflix' && s.is_dubbed);
  const dubbed = series.filter(s => s.is_dubbed);

  if (loading) {
    return <div className="grid min-h-[70vh] place-items-center text-white/50">Loading catalog...</div>;
  }
  if (!series.length) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-white/60">
      <h2 className="mb-2 text-2xl font-bold text-white">No dramas yet</h2>
      <p>Add some from the Admin panel to get started.</p>
    </div>;
  }

  return (
    <div className="-mt-16">
      {featured && <HeroBanner series={featured} />}
      <div className="relative -mt-16 space-y-6 pb-16 sm:-mt-24">

        {continueWatching.length > 0 && <Carousel title="Continue Watching" series={continueWatching} />}
        {netflixDubbed.length > 0 && <Carousel title="Populares na Netflix (Dublados)" series={netflixDubbed} />}
        {dubbed.length > 0 && <Carousel title="Audio Dublado" series={dubbed} />}
        <Carousel title="K-Dramas" series={k} />
        <Carousel title="J-Dramas" series={j} />
        <Carousel title="C-Dramas" series={c} />
        <Carousel title="Recently Added" series={[...series].slice(0, 12)} />
      </div>
    </div>
  );
}
