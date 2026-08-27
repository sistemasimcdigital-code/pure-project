import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Episode, Series } from "@/lib/types";
import { EPISODE_COLUMNS } from "@/lib/types";
import {
  MEDIA_SIZE_LIMIT,
  mediaObjectExists,
  removeMedia,
  safeFileName,
  signedArtUrl,
  uploadResumable,
  uploadWithProgress,
  type ResumableHandle,
} from "@/lib/storage";
import { AlertTriangle, CheckCircle2, RotateCcw, Trash2, Upload } from "lucide-react";

export const TARGET_SERIES_TITLE = "A Noiva Errada do Príncipe";

const EXPECTED_PATH: Record<number, string> = {
  1: "a-noiva-errada-do-principe/temporada-1/parte-01.mp4",
  2: "a-noiva-errada-do-principe/temporada-1/parte-02.mp4",
  3: "a-noiva-errada-do-principe/temporada-1/parte-03.mp4",
  4: "a-noiva-errada-do-principe/temporada-1/parte-04.mp4",
  5: "a-noiva-errada-do-principe/temporada-1/parte-05.mp4",
  6: "a-noiva-errada-do-principe/temporada-1/parte-final.mp4",
};

type SlotStatus = "waiting" | "ready" | "preparing" | "uploading" | "done" | "error" | "published";

type SlotState = {
  file: File | null;
  pct: number;
  status: SlotStatus;
  message: string | null;
};

const STATUS_LABEL: Record<SlotStatus, string> = {
  waiting: "Aguardando vídeo",
  ready: "Pronto para enviar",
  preparing: "Preparando upload",
  uploading: "Enviando",
  done: "Upload concluído",
  error: "Erro — tentar novamente",
  published: "Publicado",
};

const ACCEPT = "video/mp4,video/webm,video/mpeg,video/quicktime,.mp4,.webm,.mpeg,.mpg,.mov";
const VALID_EXT = /\.(mp4|webm|mpeg|mpg|mov)$/i;
const VALID_MIME = /^video\/(mp4|webm|mpeg|quicktime|x-m4v)$/;


const fmtSize = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const emptySlot = (): SlotState => ({ file: null, pct: 0, status: "waiting", message: null });

export function PartsUploader() {
  const [series, setSeries] = useState<Series | null>(null);
  const [eps, setEps] = useState<Episode[]>([]);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [mediaPath, setMediaPath] = useState<Record<string, string | null>>({});
  const [objectOk, setObjectOk] = useState<Record<string, boolean>>({});
  const [posterPct, setPosterPct] = useState<number | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const handles = useRef<Record<string, ResumableHandle | null>>({});

  const load = useCallback(async () => {
    const { data: s } = await supabase
      .from("series")
      .select("*")
      .eq("title", TARGET_SERIES_TITLE)
      .maybeSingle();
    const row = (s as unknown as Series | null) ?? null;
    setSeries(row);
    if (!row) return;
    const { data: e } = await supabase
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .eq("series_id", row.id)
      .order("episode_number");
    const list = (e as unknown as Episode[]) ?? [];
    setEps(list);
    const { data: media } = await supabase.rpc("admin_list_episode_media", { _series_id: row.id });
    const paths: Record<string, string | null> = {};
    ((media as { episode_id: string; media_path: string | null }[] | null) ?? []).forEach((m) => {
      paths[m.episode_id] = m.media_path;
    });
    setMediaPath(paths);
    setSlots((prev) => {
      const next: Record<string, SlotState> = {};
      for (const ep of list) {
        const existing = prev[ep.id];
        if (existing && (existing.status === "uploading" || existing.status === "preparing")) {
          next[ep.id] = existing;
        } else if (ep.published && paths[ep.id]) {
          next[ep.id] = { ...emptySlot(), status: "published" };
        } else if (paths[ep.id]) {
          next[ep.id] = { ...emptySlot(), status: "done" };
        } else {
          next[ep.id] = existing?.status === "error" ? existing : emptySlot();
        }
      }
      return next;
    });
    const checks = await Promise.all(
      list.map(async (ep) => {
        const path = paths[ep.id];
        return [ep.id, path ? await mediaObjectExists(path) : false] as const;
      }),
    );
    setObjectOk(Object.fromEntries(checks));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Capa privada: gera uma URL assinada renovada a cada carregamento da página.
  useEffect(() => {
    if (!series?.poster_url) return setPosterPreview(null);
    const path = series.poster_url.startsWith("http") ? null : series.poster_url;
    if (!path) return setPosterPreview(series.poster_url);
    signedArtUrl(path)
      .then(setPosterPreview)
      .catch(() => setPosterPreview(null));
  }, [series?.poster_url]);

  const setSlot = (id: string, patch: Partial<SlotState>) =>
    setSlots((s) => ({ ...s, [id]: { ...(s[id] ?? emptySlot()), ...patch } }));

  const pickFile = (ep: Episode, file: File) => {
    if (!VALID_MIME.test(file.type) && !VALID_EXT.test(file.name)) {
      return setSlot(ep.id, { file: null, status: "error", message: "Envie um vídeo MP4, WebM, MPEG ou MOV." });
    }
    if (file.size > MEDIA_SIZE_LIMIT) {
      return setSlot(ep.id, {
        file: null,
        status: "error",
        message: `Arquivo de ${fmtSize(file.size)} excede o limite de ${fmtSize(MEDIA_SIZE_LIMIT)} do armazenamento.`,
      });
    }
    setSlot(ep.id, { file, pct: 0, status: "ready", message: null });
  };

  const send = async (ep: Episode) => {
    const slot = slots[ep.id];
    const file = slot?.file;
    if (!file) return setSlot(ep.id, { status: "error", message: "Escolha um arquivo antes de enviar." });
    setSlot(ep.id, { status: "preparing", pct: 0, message: null });
    const ext = (file.name.match(VALID_EXT)?.[1] ?? "mp4").toLowerCase();
    const path = (EXPECTED_PATH[ep.episode_number] ?? `a-noiva-errada-do-principe/temporada-1/parte-${ep.episode_number}.mp4`)
      .replace(/\.mp4$/, `.${ext}`);
    handles.current[ep.id] = await uploadResumable(
      path,
      file,
      (pct) => setSlot(ep.id, { status: "uploading", pct }),
      async (err) => {
        handles.current[ep.id] = null;
        if (err) return setSlot(ep.id, { status: "error", message: err.message });
        const { error: upErr } = await supabase.rpc("admin_set_episode_media", {
          _episode_id: ep.id,
          _media_path: path,
        });
        if (upErr) {
          // Evita objeto órfão no armazenamento quando o banco não confirma o vínculo.
          await removeMedia(path).catch(() => {});
          return setSlot(ep.id, { status: "error", message: upErr.message });
        }
        setSlot(ep.id, { status: "done", pct: 100, file: null, message: null });
        load();
      },
    );
  };


  const removeUploaded = async (ep: Episode) => {
    const path = mediaPath[ep.id];
    if (!path) return;
    if (!confirm(`Remover o vídeo enviado de "${ep.title}"?`)) return;
    try {
      await removeMedia(path);
      await supabase.rpc("admin_set_episode_media", { _episode_id: ep.id, _media_path: "" });
      setSlot(ep.id, emptySlot());
      load();
    } catch (e) {
      setSlot(ep.id, { status: "error", message: e instanceof Error ? e.message : "Falha ao remover." });
    }
  };

  const uploadPoster = async (file: File, field: "poster_url" | "backdrop_url") => {
    if (!series) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Use imagens JPG, PNG ou WEBP.");
    if (file.size > 10 * 1024 * 1024) return setError("A imagem deve ter até 10 MB.");
    setPosterPct(0);
    try {
      const path = `${field === "poster_url" ? "posters" : "backdrops"}/${safeFileName(file.name)}`;
      await uploadWithProgress("catalog-art", path, file, setPosterPct);
      // Bucket privado: guarda uma URL assinada, renovada a cada novo envio.
      const url = await signedArtUrl(path);
      await supabase
        .from("series")
        .update({ [field]: url } as never)
        .eq("id", series.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload da imagem.");
    } finally {
      setPosterPct(null);
    }
  };

  const uploading = Object.values(slots).some((s) => s.status === "uploading" || s.status === "preparing");
  const missing = eps.filter((e) => !mediaPath[e.id] || !objectOk[e.id]);
  const canPublish =
    !!series && !!series.poster_url && eps.length === 6 && missing.length === 0 && !uploading;

  const publish = async () => {
    if (!series || !canPublish) return;
    if (!confirm("Publicar a série e as seis partes? O conteúdo ficará visível no catálogo.")) return;
    const { error: e1 } = await supabase.from("episodes").update({ published: true }).eq("series_id", series.id);
    const { error: e2 } = await supabase
      .from("series")
      .update({ published: true, episode_count: eps.length })
      .eq("id", series.id);
    if (e1 || e2) return setError((e1 ?? e2)!.message);
    setNotice("Série publicada com sucesso.");
    load();
  };

  if (!series) {
    return (
      <p className="text-sm text-white/60">
        A série “{TARGET_SERIES_TITLE}” não foi encontrada no catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <h2 className="text-lg font-bold">{TARGET_SERIES_TITLE} — Upload de partes</h2>
        <p className="mt-1 text-xs text-white/50">
          Envio direto do seu computador para o armazenamento privado do projeto, em blocos de 6 MB e com
          retomada automática em caso de queda de conexão. Limite por arquivo: {fmtSize(MEDIA_SIZE_LIMIT)}.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            {posterPreview && <img src={posterPreview} alt="Capa da série" className="h-full w-full object-cover" />}
          </div>
          <div className="grid flex-1 gap-2">
            <label className="text-xs font-semibold text-white/70">Capa (poster) — armazenamento privado</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPoster(f, "poster_url");
                e.target.value = "";
              }}
              className="text-xs text-white/70"
            />
            <label className="text-xs font-semibold text-white/70">Banner (backdrop) — opcional</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPoster(f, "backdrop_url");
                e.target.value = "";
              }}
              className="text-xs text-white/70"
            />
            {posterPct !== null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-primary transition-all" style={{ width: `${posterPct}%` }} />
              </div>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {notice && <p className="mt-3 text-sm text-primary">{notice}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {eps.map((ep) => {
          const slot = slots[ep.id] ?? emptySlot();
          return (
            <div key={ep.id} className="rounded-xl border border-white/10 bg-card/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">
                  {ep.title} <span className="text-xs font-normal text-white/40">· ordem {ep.episode_number}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    slot.status === "error"
                      ? "bg-destructive/20 text-destructive"
                      : slot.status === "done" || slot.status === "published"
                        ? "bg-primary/20 text-primary"
                        : "bg-white/10 text-white/60"
                  }`}
                >
                  {STATUS_LABEL[slot.status]}
                  {slot.status === "uploading" ? ` ${slot.pct}%` : ""}
                </span>
              </div>

              <p className="mt-2 truncate text-[11px] text-white/40">
                {mediaPath[ep.id]
                  ? `Arquivo no armazenamento: ${mediaPath[ep.id]}${objectOk[ep.id] ? "" : " (objeto não localizado)"}`
                  : `Caminho previsto: ${EXPECTED_PATH[ep.episode_number] ?? "—"}`}
              </p>

              {slot.status !== "published" && (
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(ep, f);
                    e.target.value = "";
                  }}
                  className="mt-3 w-full text-xs text-white/70"
                />
              )}

              {slot.file && (
                <p className="mt-2 truncate text-[11px] text-white/60">
                  {slot.file.name} · {fmtSize(slot.file.size)}
                </p>
              )}

              {(slot.status === "uploading" || slot.status === "preparing") && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-primary transition-all" style={{ width: `${slot.pct}%` }} />
                </div>
              )}

              {slot.message && (
                <p className="mt-2 flex items-start gap-1 text-[11px] text-destructive">
                  <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> {slot.message}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => send(ep)}
                  disabled={!slot.file || slot.status === "uploading" || slot.status === "preparing"}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  <Upload className="h-3.5 w-3.5" /> Enviar vídeo
                </button>
                {slot.status === "error" && (
                  <button
                    onClick={() => send(ep)}
                    className="inline-flex items-center gap-1 rounded-md glass px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
                  </button>
                )}
                {mediaPath[ep.id] && (
                  <button
                    onClick={() => removeUploaded(ep)}
                    className="inline-flex items-center gap-1 rounded-md glass px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover arquivo enviado
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl glass p-5">
        <h3 className="text-sm font-bold">Publicação</h3>
        {series.published ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> Série publicada no catálogo.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-white/60">
            <li>{series.poster_url ? "✓" : "•"} Capa enviada</li>
            <li>{eps.length === 6 ? "✓" : "•"} Seis partes cadastradas</li>
            <li>
              {missing.length === 0
                ? "✓ Todas as partes com vídeo no armazenamento"
                : `• Falta enviar: ${missing.map((m) => m.title).join(", ")}`}
            </li>
            <li>{uploading ? "• Aguardando o término dos uploads" : "✓ Nenhum upload em andamento"}</li>
          </ul>
        )}
        <button
          onClick={publish}
          disabled={!canPublish || series.published}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Publicar série
        </button>
      </div>
    </div>
  );
}
