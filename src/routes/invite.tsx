import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "Concluir acesso · Doramaflix" },
      { name: "description", content: "Conclua seu cadastro no Doramaflix e defina sua senha para assistir aos doramas." },
      { property: "og:title", content: "Concluir acesso · Doramaflix" },
      { property: "og:description", content: "Conclua seu cadastro no Doramaflix e comece a assistir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setStatus(data.session ? "ready" : "invalid");
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setStatus("ready");
    });
    const t = setTimeout(check, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError("Use pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e) return setError("Não foi possível concluir. Solicite um novo convite.");
    nav({ to: "/home", replace: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-2xl glass p-7">
        <h1 className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Concluir meu acesso
        </h1>

        {status === "checking" && <p className="mt-3 text-sm text-white/60">Validando seu convite…</p>}

        {status === "invalid" && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-white/70">
              Este convite expirou ou já foi utilizado. Solicite um novo convite ao administrador ou
              recupere seu acesso pela tela de entrada.
            </p>
            <button
              onClick={() => nav({ to: "/" })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-bold"
            >
              Ir para a entrada
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white/60">Defina uma senha para acessar o Doramaflix.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar senha"
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              disabled={busy}
              onClick={submit}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Concluir meu acesso"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
