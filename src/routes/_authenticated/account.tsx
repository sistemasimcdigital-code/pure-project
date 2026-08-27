import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccess } from "@/hooks/useAccess";
import { SUB_STATUS_LABEL } from "@/lib/types";
import { LifeBuoy, ShieldCheck, ShieldX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Minha conta — Doramaflix" },
      {
        name: "description",
        content: "Veja o status do seu acesso Doramaflix, data de início, validade e origem da autorização.",
      },
      { property: "og:title", content: "Minha conta — Doramaflix" },
      { property: "og:description", content: "Status do acesso premium da sua conta na Doramaflix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

const SOURCE_LABEL: Record<string, string> = {
  facebook_manual: "Assinatura externa (página do Facebook)",
  external_manual: "Ativação administrativa",
  activation_code: "Código de ativação",
};

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

function Account() {
  const { loading, email, hasAccess, subscription } = useAccess();

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center text-white/50">Carregando…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1
        className="text-3xl font-black tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Minha conta
      </h1>
      <p className="mt-1 text-sm text-white/50">{email}</p>

      <div className="mt-6 rounded-2xl glass-strong p-6">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-11 w-11 place-items-center rounded-xl ${hasAccess ? "bg-primary/20 text-primary" : "bg-white/10 text-white/60"}`}
          >
            {hasAccess ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-lg font-bold">{hasAccess ? "Acesso ativo" : "Sem acesso ativo"}</div>
            <div className="text-xs text-white/50">
              {subscription ? SUB_STATUS_LABEL[subscription.status] : "Nenhum registro de acesso"}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-white/40">Início</dt>
            <dd>{fmtDate(subscription?.started_at ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/40">Validade</dt>
            <dd>{subscription?.expires_at ? fmtDate(subscription.expires_at) : "Sem data de expiração"}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/40">Origem</dt>
            <dd>{subscription ? (SOURCE_LABEL[subscription.source] ?? subscription.source) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/40">Cancelado em</dt>
            <dd>{fmtDate(subscription?.cancelled_at ?? null)}</dd>
          </div>
        </dl>

        <p className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
          A Doramaflix não cobra assinatura. O acesso é concedido a assinantes autorizados externamente e
          permanece ativo enquanto a autorização estiver válida.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {!hasAccess && (
            <Link
              to="/activate"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold shadow-[0_0_30px_rgba(229,9,20,0.4)]"
            >
              Ativar acesso
            </Link>
          )}
          <a
            href="mailto:suporte@doramaflix.app?subject=Suporte%20Doramaflix"
            className="inline-flex items-center gap-2 rounded-lg glass px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            <LifeBuoy className="h-4 w-4" /> Falar com o suporte
          </a>
        </div>
      </div>
    </div>
  );
}
