import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/useAccess";
import type { ActivationCode, DramaType, Episode, Season, Series, SubscriptionStatus } from "@/lib/types";
import { EPISODE_COLUMNS, SUB_STATUS_LABEL } from "@/lib/types";
import { Check, Copy, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { safeFileName, uploadWithProgress } from "@/lib/storage";
import { useSignedCatalogImage } from "@/hooks/useSignedCatalogImage";

import { PartsUploader } from "@/components/admin/PartsUploader";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

type Tab = "uploads" | "series" | "episodes" | "subscribers" | "codes";

const TAB_LABEL: Record<Tab, string> = {
  uploads: "Upload de partes",
  series: "Séries",
  episodes: "Episódios",
  subscribers: "Assinantes",
  codes: "Códigos",
};

function Admin() {
  const { loading, isAdmin } = useAccess();
  const [series, setSeries] = useState<Series[]>([]);
  const [tab, setTab] = useState<Tab>("uploads");

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("series")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setSeries((data as unknown as Series[]) ?? []));
  }, [isAdmin]);

  if (loading) return <div className="grid min-h-[60vh] place-items-center text-white/50">Carregando…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-primary">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-white/60">
          Esta área é exclusiva de administradores. O papel de administrador só pode ser concedido por
          outro administrador já autorizado.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1
        className="mb-6 text-3xl font-black tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Administração
      </h1>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-black/30 p-1">
        {(["uploads", "series", "episodes", "subscribers", "codes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-white" : "text-white/60 hover:text-white"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      {tab === "uploads" && <PartsUploader />}
      {tab === "series" && <SeriesPanel series={series} onChange={setSeries} />}
      {tab === "episodes" && <EpisodesPanel series={series} />}
      {tab === "subscribers" && <SubscribersPanel />}
      {tab === "codes" && <CodesPanel />}
    </div>
  );
}

const inputCls = "rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm";

function SeriesPanel({ series, onChange }: { series: Series[]; onChange: (s: Series[]) => void }) {
  const [form, setForm] = useState({
    title: "",
    synopsis: "",
    type: "kdrama" as DramaType,
    year: new Date().getFullYear(),
    poster_url: "",
    backdrop_url: "",
    featured: false,
    is_dubbed: false,
    published: true,
    is_premium: true,
    content_rating: "",
    language: "",
    license_note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [artBusy, setArtBusy] = useState<"poster_url" | "backdrop_url" | null>(null);
  const [artPct, setArtPct] = useState(0);

  const uploadArt = async (field: "poster_url" | "backdrop_url", file: File) => {
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Use imagens JPG, PNG ou WEBP.");
    if (file.size > 10 * 1024 * 1024) return setError("A imagem deve ter até 10 MB.");
    setArtBusy(field);
    setArtPct(0);
    try {
      const path = `${field === "poster_url" ? "poster" : "backdrop"}/${safeFileName(file.name)}`;
      await uploadWithProgress("catalog-art", path, file, setArtPct);
      // Guarda somente o caminho do objeto; a URL assinada é gerada na exibição.
      setForm((f) => ({ ...f, [field]: path }));

    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload da imagem.");
    } finally {
      setArtBusy(null);
    }
  };


  const save = async () => {
    setError(null);
    if (!form.title.trim()) return setError("Informe o título da série.");

    const { data, error: insertError } = await supabase
      .from("series")
      .insert(form as never)
      .select()
      .single();
    if (insertError) return setError(insertError.message);
    onChange([data as unknown as Series, ...series]);
    setForm({ ...form, title: "", synopsis: "", poster_url: "", backdrop_url: "" });
  };

  const del = async (id: string) => {
    if (!confirm("Excluir a série e todos os episódios? Esta ação não pode ser desfeita.")) return;
    const { error: delError } = await supabase.from("series").delete().eq("id", id);
    if (delError) return setError(delError.message);
    onChange(series.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <h2 className="mb-4 text-lg font-bold">Doramaflix série</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DramaType })} className={inputCls}>
            <option value="kdrama">K-Drama</option>
            <option value="jdrama">J-Drama</option>
            <option value="cdrama">C-Drama</option>
          </select>
          <input type="number" placeholder="Ano" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} className={inputCls} />
          <input placeholder="Classificação (ex.: 16 anos)" value={form.content_rating} onChange={(e) => setForm({ ...form, content_rating: e.target.value })} className={inputCls} />
          <input placeholder="Idioma original (ex.: Coreano)" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls} />
          <input placeholder="Observação de licença" value={form.license_note} onChange={(e) => setForm({ ...form, license_note: e.target.value })} className={inputCls} />
          {(["poster_url", "backdrop_url"] as const).map((field) => (
            <div key={field} className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:col-span-2">
              <label className="text-xs font-semibold text-white/70">
                {field === "poster_url" ? "Poster (capa vertical)" : "Backdrop (imagem de destaque)"}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadArt(field, f);
                  e.target.value = "";
                }}
                className="text-xs text-white/70"
              />
              {artBusy === field && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-primary transition-all" style={{ width: `${artPct}%` }} />
                </div>
              )}
              {form[field] && <p className="truncate text-[11px] text-white/40">Imagem enviada ✓</p>}
            </div>
          ))}

          <textarea placeholder="Sinopse" value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={3} />
          <div className="flex flex-wrap gap-4 sm:col-span-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destaque na home</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_dubbed} onChange={(e) => setForm({ ...form, is_dubbed: e.target.checked })} /> Áudio dublado (PT-BR)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publicada</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} /> Conteúdo premium</label>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold">
          <Plus className="h-4 w-4" /> Adicionar série
        </button>
      </div>

      <div className="grid gap-2">
        {series.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-2">
            <SeriesThumb path={s.poster_url} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {s.title} <span className="text-xs text-white/40">· {s.type}</span>
              </div>
              <div className="text-xs text-white/50">
                {s.episode_count} ep {s.published ? "" : "· não publicada"} {s.is_sample_data ? "· dados de exemplo" : ""}
              </div>
            </div>
            <button onClick={() => del(s.id)} className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-destructive/20 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const STORAGE_HOST = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";

function EpisodesPanel({ series }: { series: Series[] }) {
  const [seriesId, setSeriesId] = useState<string>("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [eps, setEps] = useState<Episode[]>([]);
  const [seasonNum, setSeasonNum] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [ep, setEp] = useState({
    season_id: "",
    episode_number: 1,
    title: "",
    synopsis: "",
    duration_seconds: 0,
    thumbnail_url: "",
    video_url: "",
    media_path: "",
    published: true,
    is_premium: true,
  });

  useEffect(() => {
    if (!seriesId) return;
    supabase
      .from("seasons")
      .select("*")
      .eq("series_id", seriesId)
      .order("season_number")
      .then(({ data }) => {
        const s = (data as Season[]) ?? [];
        setSeasons(s);
        if (s[0]) setEp((e) => ({ ...e, season_id: s[0]!.id }));
      });
    supabase
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .eq("series_id", seriesId)
      .order("episode_number")
      .then(({ data }) => setEps((data as unknown as Episode[]) ?? []));
  }, [seriesId]);

  const [videoPct, setVideoPct] = useState<number | null>(null);
  const untrustedMedia = !!ep.video_url && !!STORAGE_HOST && !ep.video_url.startsWith(STORAGE_HOST);

  const uploadVideo = async (file: File) => {
    setError(null);
    if (!/\.(mp4|webm|m3u8)$/i.test(file.name)) return setError("Envie arquivos MP4, WEBM ou playlist .m3u8.");
    setVideoPct(0);
    try {
      const path = `${seriesId}/${safeFileName(file.name)}`;
      await uploadWithProgress("media", path, file, setVideoPct);
      setEp((e) => ({ ...e, media_path: path, video_url: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload do vídeo.");
    } finally {
      setVideoPct(null);
    }
  };

  const addSeason = async () => {
    if (!seriesId) return;
    const { data, error: e } = await supabase
      .from("seasons")
      .insert({ series_id: seriesId, season_number: seasonNum, title: `Temporada ${seasonNum}` })
      .select()
      .single();
    if (e) return setError(e.message);
    setSeasons([...seasons, data as Season]);
  };

  const addEp = async () => {
    setError(null);
    if (!seriesId || !ep.season_id) return setError("Selecione a série e a temporada.");
    if (!ep.title.trim()) return setError("Informe o título do episódio.");
    if (!ep.media_path && !/^https:\/\/.+/i.test(ep.video_url))
      return setError("Envie o arquivo de vídeo licenciado ou informe uma URL https válida.");
    const { data, error: e } = await supabase
      .from("episodes")
      .insert({ ...ep, series_id: seriesId, media_path: ep.media_path || null, video_url: ep.video_url || null })
      .select(EPISODE_COLUMNS)
      .single();
    if (e) return setError(e.message);
    setEps([...eps, data as unknown as Episode]);
    await supabase.from("series").update({ episode_count: eps.length + 1 }).eq("id", seriesId);
    setEp({ ...ep, title: "", synopsis: "", video_url: "", media_path: "", thumbnail_url: "", episode_number: ep.episode_number + 1 });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <label className="mb-2 block text-xs font-semibold text-white/70">Série</label>
        <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={`w-full ${inputCls}`}>
          <option value="">Selecionar série…</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {seriesId && (
        <>
          <div className="rounded-xl glass p-5">
            <h3 className="mb-3 text-sm font-bold">Temporadas</h3>
            <div className="flex flex-wrap gap-2">
              {seasons.map((s) => (
                <div key={s.id} className="rounded-md bg-black/40 px-3 py-1.5 text-xs">Temporada {s.season_number}</div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input type="number" min={1} value={seasonNum} onChange={(e) => setSeasonNum(+e.target.value)} className={`w-24 ${inputCls}`} />
              <button onClick={addSeason} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold">Adicionar temporada</button>
            </div>
          </div>

          <div className="rounded-xl glass p-5">
            <h3 className="mb-3 text-sm font-bold">Novo episódio</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={ep.season_id} onChange={(e) => setEp({ ...ep, season_id: e.target.value })} className={inputCls}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>Temporada {s.season_number}</option>
                ))}
              </select>
              <input type="number" placeholder="Nº do episódio" value={ep.episode_number} onChange={(e) => setEp({ ...ep, episode_number: +e.target.value })} className={inputCls} />
              <input placeholder="Título *" value={ep.title} onChange={(e) => setEp({ ...ep, title: e.target.value })} className={`${inputCls} sm:col-span-2`} />
              <div className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:col-span-2">
                <label className="text-xs font-semibold text-white/70">Mídia licenciada (upload para armazenamento privado)</label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,.m3u8"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadVideo(f);
                    e.target.value = "";
                  }}
                  className="text-xs text-white/70"
                />
                {videoPct !== null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-primary transition-all" style={{ width: `${videoPct}%` }} />
                  </div>
                )}
                {ep.media_path && <p className="truncate text-[11px] text-white/40">Arquivo protegido: {ep.media_path}</p>}
                <input placeholder="Ou URL externa de streaming protegido (https)" value={ep.video_url} onChange={(e) => setEp({ ...ep, video_url: e.target.value, media_path: "" })} className={inputCls} />
              </div>
              <input placeholder="URL da miniatura (https)" value={ep.thumbnail_url} onChange={(e) => setEp({ ...ep, thumbnail_url: e.target.value })} className={inputCls} />
              <input type="number" placeholder="Duração (segundos)" value={ep.duration_seconds} onChange={(e) => setEp({ ...ep, duration_seconds: +e.target.value })} className={inputCls} />
              <textarea placeholder="Sinopse" value={ep.synopsis} onChange={(e) => setEp({ ...ep, synopsis: e.target.value })} className={`${inputCls} sm:col-span-2`} rows={2} />
              <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={ep.published} onChange={(e) => setEp({ ...ep, published: e.target.checked })} /> Publicado</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={ep.is_premium} onChange={(e) => setEp({ ...ep, is_premium: e.target.checked })} /> Premium</label>
              </div>
            </div>
            {untrustedMedia && (
              <p className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                Atenção: esta URL não pertence ao storage autorizado do projeto. Use upload em bucket privado
                ou um provedor de vídeo com streaming protegido.
              </p>
            )}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button onClick={addEp} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold">Adicionar episódio</button>
          </div>

          <div className="grid gap-2">
            {eps.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-2">
                {e.thumbnail_url && <img src={e.thumbnail_url} alt="" className="h-12 w-20 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">EP {e.episode_number} · {e.title}</div>
                  <div className="text-xs text-white/50">
                    {e.published ? "Publicado" : "Rascunho"} {e.is_premium ? "· premium" : "· aberto"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ProfileRow = { id: string; email: string | null; display_name: string | null };

function SubscribersPanel() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [subs, setSubs] = useState<Record<string, { status: SubscriptionStatus; expires_at: string | null }>>({});
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [expiry, setExpiry] = useState("");

  const load = async (term: string) => {
    setState("loading");
    let query = supabase.from("profiles").select("id, email, display_name").limit(25);
    if (term.trim()) query = query.ilike("email", `%${term.trim().toLowerCase()}%`);
    const { data, error } = await query;
    if (error) return setState("error");
    const list = (data as ProfileRow[]) ?? [];
    setRows(list);
    const { data: s } = await supabase
      .from("subscriptions")
      .select("user_id, status, expires_at, created_at")
      .in("user_id", list.map((r) => r.id))
      .order("created_at", { ascending: false });
    const map: Record<string, { status: SubscriptionStatus; expires_at: string | null }> = {};
    ((s as { user_id: string; status: SubscriptionStatus; expires_at: string | null }[]) ?? []).forEach((row) => {
      if (!map[row.user_id]) map[row.user_id] = { status: row.status, expires_at: row.expires_at };
    });
    setSubs(map);
    setState("idle");
  };

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (userId: string, status: SubscriptionStatus) => {
    if (status !== "active" && !confirm(`Confirmar alteração para "${SUB_STATUS_LABEL[status]}"?`)) return;
    const { error } = await supabase.rpc("admin_set_subscription", {
      _user_id: userId,
      _status: status,
      _expires_at: status === "active" && expiry ? new Date(expiry).toISOString() : undefined,
    });
    if (error) return alert(error.message);
    load(q);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl glass p-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por e-mail…" className={`w-full ${inputCls}`} />
        <label className="mt-3 block text-xs text-white/50">Expiração ao ativar (opcional)</label>
        <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={`mt-1 ${inputCls}`} />
      </div>

      {state === "loading" && <p className="text-sm text-white/50">Carregando assinantes…</p>}
      {state === "error" && <p className="text-sm text-destructive">Erro ao carregar. Tente novamente.</p>}
      {state === "idle" && rows.length === 0 && <p className="text-sm text-white/50">Nenhuma conta encontrada.</p>}

      <div className="grid gap-2">
        {rows.map((r) => {
          const sub = subs[r.id];
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{r.email ?? r.display_name ?? r.id}</div>
                <div className="text-xs text-white/50">
                  {sub ? SUB_STATUS_LABEL[sub.status] : "Sem acesso"}
                  {sub?.expires_at ? ` · até ${new Date(sub.expires_at).toLocaleDateString("pt-BR")}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(r.id, "active")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold">Ativar</button>
                <button onClick={() => act(r.id, "suspended")} className="rounded-md glass px-3 py-1.5 text-xs font-semibold hover:bg-white/10">Suspender</button>
                <button onClick={() => act(r.id, "cancelled")} className="rounded-md glass px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 hover:text-destructive">Cancelar</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `DORA${block()}${block()}`;
}

function CodesPanel() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [days, setDays] = useState<number>(30);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error: e } = await supabase
      .from("activation_codes")
      .select("id, code_last4, status, note, grants_days, created_at, redeemed_at, redeemed_by, expires_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (e) return setError("Não foi possível carregar os códigos.");
    setCodes((data as unknown as ActivationCode[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError(null);
    if (!days || days < 1) return setError("Informe a duração do acesso (mínimo 1 dia).");
    const code = randomCode();
    const { error: e } = await supabase.rpc("admin_create_activation_code", {
      _code: code,
      _grants_days: Number(days),
      _expires_at: undefined,
      _note: note || undefined,
    });
    if (e) return setError(e.message);
    setCreated(code);
    setCopied(false);
    setNote("");
    load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Revogar este código?")) return;
    const { error: e } = await supabase.rpc("admin_revoke_activation_code", { _code_id: id });
    if (e) return setError(e.message);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl glass p-5">
        <h3 className="mb-3 text-sm font-bold">Gerar código de ativação</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="number" min={1} placeholder="Dias de acesso (mínimo 1)" value={days} onChange={(e) => setDays(+e.target.value)} className={inputCls} />
          <input placeholder="Observação interna" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </div>
        <button onClick={create} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold">Gerar código</button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        {created && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-xs text-white/60">Copie agora — o código completo não será exibido novamente.</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="flex-1 truncate text-lg font-bold tracking-widest text-primary">{created}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(created);
                  setCopied(true);
                }}
                className="inline-flex items-center gap-1 rounded-md glass px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        {codes.length === 0 && <p className="text-sm text-white/50">Nenhum código gerado ainda.</p>}
        {codes.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-card/60 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">•••• {c.code_last4}</div>
              <div className="text-xs text-white/50">
                {c.status === "available" && "Disponível"}
                {c.status === "redeemed" && `Resgatado em ${new Date(c.redeemed_at!).toLocaleDateString("pt-BR")}`}
                {c.status === "revoked" && "Revogado"}
                {c.status === "expired" && "Expirado"}
                {c.grants_days ? ` · ${c.grants_days} dias` : " · sem expiração"}
                {c.note ? ` · ${c.note}` : ""}
              </div>
            </div>
            {c.status === "available" && (
              <button onClick={() => revoke(c.id)} className="rounded-md glass px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 hover:text-destructive">
                Revogar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
