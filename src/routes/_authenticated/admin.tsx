import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DramaType, Episode, Season, Series } from "@/lib/types";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

function Admin() {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [tab, setTab] = useState<"series" | "episodes">("series");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/" }); return; }
      setUserId(u.user.id);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      setIsAdmin(!!r?.some(x => x.role === "admin"));
      const { data: s } = await supabase.from("series").select("*").order("created_at", { ascending: false });
      setSeries((s as Series[]) ?? []);
    })();
  }, [nav]);

  if (isAdmin === null) return <div className="grid min-h-[60vh] place-items-center text-white/50">Loading...</div>;

  if (!isAdmin) {
    const grantSelf = async () => {
      if (!userId) return;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (!error) location.reload();
      else alert(error.message);
    };
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-primary">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-white/60">Your account isn't an admin yet. If this is your first setup, grant yourself admin below.</p>
        <button onClick={grantSelf} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-bold shadow-[0_0_30px_rgba(59,130,246,0.4)]">Make me admin</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-3xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Admin</h1>
      <div className="mb-6 flex gap-1 rounded-lg bg-black/30 p-1">
        {(["series", "episodes"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-white" : "text-white/60 hover:text-white"}`}>
            {t === "series" ? "Series" : "Episodes"}
          </button>
        ))}
      </div>
      {tab === "series" ? <SeriesPanel series={series} onChange={setSeries} /> : <EpisodesPanel series={series} />}
    </div>
  );
}

function SeriesPanel({ series, onChange }: { series: Series[]; onChange: (s: Series[]) => void }) {
  const [form, setForm] = useState({
    title: "", synopsis: "", type: "kdrama" as DramaType, year: 2025, rating: 8.5,
    poster_url: "", backdrop_url: "", featured: false,
  });
  const save = async () => {
    const { data, error } = await supabase.from("series").insert(form).select().single();
    if (error) return alert(error.message);
    onChange([data as Series, ...series]);
    setForm({ ...form, title: "", synopsis: "", poster_url: "", backdrop_url: "" });
  };
  const del = async (id: string) => {
    if (!confirm("Delete series and all episodes?")) return;
    const { error } = await supabase.from("series").delete().eq("id", id);
    if (error) return alert(error.message);
    onChange(series.filter(s => s.id !== id));
  };
  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <h2 className="mb-4 text-lg font-bold">Add series</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as DramaType })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm">
            <option value="kdrama">K-Drama</option><option value="jdrama">J-Drama</option><option value="cdrama">C-Drama</option>
          </select>
          <input type="number" placeholder="Year" value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input type="number" step="0.1" placeholder="Rating" value={form.rating} onChange={e => setForm({ ...form, rating: +e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input placeholder="Poster URL" value={form.poster_url} onChange={e => setForm({ ...form, poster_url: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="Backdrop URL" value={form.backdrop_url} onChange={e => setForm({ ...form, backdrop_url: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm sm:col-span-2" />
          <textarea placeholder="Synopsis" value={form.synopsis} onChange={e => setForm({ ...form, synopsis: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm sm:col-span-2" rows={3} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Featured on hero</label>
        </div>
        <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold"><Plus className="h-4 w-4" /> Add series</button>
      </div>

      <div className="grid gap-2">
        {series.map(s => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-2">
            {s.poster_url && <img src={s.poster_url} className="h-14 w-10 rounded object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{s.title} <span className="text-xs text-white/40">· {s.type}</span></div>
              <div className="text-xs text-white/50">{s.episode_count} ep · ★ {s.rating?.toFixed(1)}</div>
            </div>
            <button onClick={() => del(s.id)} className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EpisodesPanel({ series }: { series: Series[] }) {
  const [seriesId, setSeriesId] = useState<string>("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [eps, setEps] = useState<Episode[]>([]);
  const [seasonNum, setSeasonNum] = useState(1);
  const [ep, setEp] = useState({
    season_id: "", episode_number: 1, title: "", synopsis: "",
    duration_seconds: 0, thumbnail_url: "", video_url: "",
  });

  useEffect(() => {
    if (!seriesId) return;
    supabase.from("seasons").select("*").eq("series_id", seriesId).order("season_number").then(({ data }) => {
      const s = (data as Season[]) ?? [];
      setSeasons(s);
      if (s[0]) setEp(e => ({ ...e, season_id: s[0].id }));
    });
    supabase.from("episodes").select("*").eq("series_id", seriesId).order("episode_number").then(({ data }) => setEps((data as Episode[]) ?? []));
  }, [seriesId]);

  const addSeason = async () => {
    if (!seriesId) return;
    const { data, error } = await supabase.from("seasons").insert({ series_id: seriesId, season_number: seasonNum, title: `Season ${seasonNum}` }).select().single();
    if (error) return alert(error.message);
    setSeasons([...seasons, data as Season]);
  };

  const addEp = async () => {
    if (!seriesId || !ep.season_id) return;
    const { data, error } = await supabase.from("episodes").insert({ ...ep, series_id: seriesId }).select().single();
    if (error) return alert(error.message);
    setEps([...eps, data as Episode]);
    // update episode_count on series
    await supabase.from("series").update({ episode_count: eps.length + 1 }).eq("id", seriesId);
    setEp({ ...ep, title: "", synopsis: "", video_url: "", thumbnail_url: "", episode_number: ep.episode_number + 1 });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <label className="mb-2 block text-xs font-semibold text-white/70">Series</label>
        <select value={seriesId} onChange={e => setSeriesId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm">
          <option value="">Select series...</option>
          {series.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      {seriesId && (
        <>
          <div className="rounded-xl glass p-5">
            <h3 className="mb-3 text-sm font-bold">Seasons</h3>
            <div className="flex flex-wrap gap-2">
              {seasons.map(s => <div key={s.id} className="rounded-md bg-black/40 px-3 py-1.5 text-xs">Season {s.season_number}</div>)}
            </div>
            <div className="mt-3 flex gap-2">
              <input type="number" min={1} value={seasonNum} onChange={e => setSeasonNum(+e.target.value)} className="w-24 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <button onClick={addSeason} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold">Add season</button>
            </div>
          </div>

          <div className="rounded-xl glass p-5">
            <h3 className="mb-3 text-sm font-bold">Add episode</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={ep.season_id} onChange={e => setEp({ ...ep, season_id: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm">
                {seasons.map(s => <option key={s.id} value={s.id}>Season {s.season_number}</option>)}
              </select>
              <input type="number" placeholder="Episode #" value={ep.episode_number} onChange={e => setEp({ ...ep, episode_number: +e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <input placeholder="Title" value={ep.title} onChange={e => setEp({ ...ep, title: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm sm:col-span-2" />
              <input placeholder="Video URL (mp4 or .m3u8)" value={ep.video_url} onChange={e => setEp({ ...ep, video_url: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm sm:col-span-2" />
              <input placeholder="Thumbnail URL" value={ep.thumbnail_url} onChange={e => setEp({ ...ep, thumbnail_url: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <input type="number" placeholder="Duration (seconds)" value={ep.duration_seconds} onChange={e => setEp({ ...ep, duration_seconds: +e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
              <textarea placeholder="Synopsis" value={ep.synopsis} onChange={e => setEp({ ...ep, synopsis: e.target.value })} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm sm:col-span-2" rows={2} />
            </div>
            <button onClick={addEp} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold">Add episode</button>
          </div>

          <div className="grid gap-2">
            {eps.map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-2">
                {e.thumbnail_url && <img src={e.thumbnail_url} className="h-12 w-20 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">EP {e.episode_number} · {e.title}</div>
                  <div className="truncate text-xs text-white/50">{e.video_url}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
