import { useEffect, useState } from "react";
import { catalogArtPath, signedArtUrl } from "@/lib/storage";

type State = { url: string | null; loading: boolean; missing: boolean; error: string | null };

const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_SECONDS = 86_400;

/**
 * Gera (e renova) uma URL assinada para imagens do bucket privado `catalog-art`.
 * O banco guarda apenas o caminho do objeto; o token vive somente no estado da tela.
 */
export function useSignedCatalogImage(value: string | null | undefined): State {
  const path = catalogArtPath(value);
  const [state, setState] = useState<State>(() => ({
    url: path ? (cache.get(path)?.url ?? null) : null,
    loading: !!path,
    missing: !path,
    error: null,
  }));

  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ url: null, loading: false, missing: true, error: null });
      return;
    }
    // URL externa (não pertence ao storage): usa direto.
    if (/^https?:\/\//i.test(path)) {
      setState({ url: path, loading: false, missing: false, error: null });
      return;
    }
    const cached = cache.get(path);
    if (cached && cached.expiresAt - Date.now() > 60_000) {
      setState({ url: cached.url, loading: false, missing: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    signedArtUrl(path, TTL_SECONDS)
      .then((url) => {
        cache.set(path, { url, expiresAt: Date.now() + TTL_SECONDS * 1000 });
        if (active) setState({ url, loading: false, missing: false, error: null });
      })
      .catch((e: unknown) => {
        if (active)
          setState({
            url: null,
            loading: false,
            missing: true,
            error: e instanceof Error ? e.message : "Falha ao carregar a imagem.",
          });
      });
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
