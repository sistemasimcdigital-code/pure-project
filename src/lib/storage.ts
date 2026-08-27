import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
const ANON_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "bin";
  const base = (dot > -1 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${Date.now()}-${base || "arquivo"}.${ext}`;
}

/**
 * Upload direto ao Storage com progresso real (XHR).
 * As políticas do banco garantem que apenas administradores conseguem enviar.
 */
export function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return reject(new Error("Sessão expirada. Entre novamente."));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", ANON_KEY);
      xhr.setRequestHeader("x-upsert", "true");
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          let msg = `Falha no upload (${xhr.status})`;
          try {
            const j = JSON.parse(xhr.responseText) as { message?: string };
            if (j.message) msg = j.message;
          } catch {
            /* resposta não-JSON */
          }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("Erro de rede durante o upload."));
      xhr.send(file);
    });
  });
}

/** URL longa e assinada para artes de catálogo (bucket privado). */
export async function signedArtUrl(path: string) {
  const { data, error } = await supabase.storage.from("catalog-art").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Não foi possível gerar a URL da imagem.");
  return data.signedUrl;
}

const MEDIA_BUCKET = "media";

/** Limite de arquivo do bucket privado de vídeos (bytes). */
export const MEDIA_SIZE_LIMIT = 5 * 1024 * 1024 * 1024;

export type ResumableHandle = { abort: () => void };

/**
 * Upload resumível (protocolo TUS do Storage) para arquivos grandes.
 * O navegador envia o arquivo em blocos de 6 MB, sem carregá-lo inteiro na memória.
 */
export async function uploadResumable(
  path: string,
  file: File,
  onProgress: (pct: number) => void,
  onDone: (err: Error | null) => void,
): Promise<ResumableHandle> {
  const { tus } = await import("tus-js-client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    onDone(new Error("Sessão expirada. Entre novamente."));
    return { abort: () => {} };
  }
  const upload = new tus.Upload(file, {
    endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 6000, 12000, 24000],
    headers: { authorization: `Bearer ${token}`, apikey: ANON_KEY, "x-upsert": "true" },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: MEDIA_BUCKET,
      objectName: path,
      contentType: file.type || "video/mp4",
      cacheControl: "3600",
    },
    chunkSize: 6 * 1024 * 1024,
    onError: (err) => onDone(err instanceof Error ? err : new Error(String(err))),
    onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
    onSuccess: () => {
      onProgress(100);
      onDone(null);
    },
  });
  const previous = await upload.findPreviousUploads();
  if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
  upload.start();
  return { abort: () => void upload.abort() };
}

/** Verifica se um objeto existe no bucket privado de vídeos. */
export async function mediaObjectExists(path: string) {
  const slash = path.lastIndexOf("/");
  const folder = slash > -1 ? path.slice(0, slash) : "";
  const name = slash > -1 ? path.slice(slash + 1) : path;
  const { data } = await supabase.storage.from(MEDIA_BUCKET).list(folder, { search: name, limit: 100 });
  return !!data?.some((o) => o.name === name);
}

/** Remove o vídeo enviado (apenas administradores, conforme políticas do banco). */
export async function removeMedia(path: string) {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
