import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/useAccess";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activate")({
  head: () => ({
    meta: [
      { title: "Ativar acesso — Doramaflix" },
      {
        name: "description",
        content:
          "Ative seu acesso premium na Doramaflix usando o código enviado após a assinatura externa autorizada.",
      },
      { property: "og:title", content: "Ativar acesso — Doramaflix" },
      {
        property: "og:description",
        content: "Informe seu código de ativação para liberar o catálogo completo da Doramaflix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Activate,
});

const MESSAGES: Record<string, string> = {
  invalid: "Código inválido. Confira os caracteres e tente novamente.",
  redeemed: "Este código já foi utilizado.",
  revoked: "Este código não está mais válido.",
  expired: "Este código expirou. Solicite um novo ao suporte.",
  already_active: "Sua conta já possui acesso ativo.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.",
  unauthorized: "Faça login para ativar o acesso.",
  error: "Não foi possível validar o código agora. Tente novamente.",
};

function Activate() {
  const nav = useNavigate();
  const access = useAccess();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.replace(/[^a-zA-Z0-9]/g, "").length < 6) {
      setError(MESSAGES["invalid"]!);
      return;
    }
    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc("redeem_activation_code", { _code: code });
    setBusy(false);
    if (rpcError) {
      setError(MESSAGES["error"]!);
      return;
    }
    const result = data as { ok: boolean; reason?: string } | null;
    if (result?.ok) {
      setDone(true);
      access.refresh();
      setTimeout(() => nav({ to: "/home" }), 1400);
      return;
    }
    setError(MESSAGES[result?.reason ?? "error"] ?? MESSAGES["error"]!);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <div className="rounded-2xl glass-strong p-6 sm:p-8">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1
          className="text-2xl font-black tracking-tight sm:text-3xl"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Ativar acesso
        </h1>
        <p className="mt-2 text-sm text-white/60">
          A Doramaflix não cobra assinatura. O acesso é liberado para assinantes autorizados externamente.
          Informe abaixo o código de ativação que você recebeu.
        </p>

        {access.hasAccess && !done && (
          <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
            <span className="inline-flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" /> Sua conta já está ativa.
            </span>
          </div>
        )}

        {done ? (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-5 text-center">
            <p className="font-bold text-primary">Acesso ativado!</p>
            <p className="mt-1 text-sm text-white/70">Redirecionando para o catálogo…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DORA-XXXX-XXXX"
              autoComplete="off"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-center text-lg font-bold tracking-[0.2em] outline-none focus:border-primary"
            />
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold shadow-[0_0_30px_rgba(229,9,20,0.4)] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Ativar acesso
            </button>
          </form>
        )}

        <div className="mt-6 space-y-2 text-xs text-white/50">
          <p>Ainda não é assinante? A assinatura é feita no canal externo do proprietário da Doramaflix.</p>
          <Link to="/account" className="font-semibold text-primary hover:underline">
            Ver status da minha conta
          </Link>
        </div>
      </div>
    </div>
  );
}
