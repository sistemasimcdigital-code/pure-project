import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Eye, EyeOff, Play } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — Sign in to premium Asian drama streaming" },
      { name: "description", content: "Sign in or create an account to stream premium K-Dramas, J-Dramas and C-Dramas." },
    ],
  }),
  component: Landing,
});

const POSTERS = [
  "https://images.unsplash.com/photo-1611262588024-d12430b98920?w=500",
  "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=500",
  "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=500",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=500",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500",
  "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=500",
  "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=500",
  "https://images.unsplash.com/photo-1554797589-7241bb691973?w=500",
  "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=500",
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500",
];

function Landing() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/home", replace: true });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName || email.split("@")[0] }, emailRedirectTo: window.location.origin + "/home" },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/home", replace: true });
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setErr(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) setErr((res.error as any).message ?? "Google sign-in failed");
    else if (!res.redirected) nav({ to: "/home", replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
      {/* Poster collage */}
      <div className="absolute inset-0 grid grid-cols-3 gap-2 opacity-40 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
        {POSTERS.map((p, i) => (
          <div key={i} className="aspect-[2/3] overflow-hidden rounded-lg" style={{ transform: `translateY(${(i % 3) * 20}px)` }}>
            <img src={p} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/70 via-[#09090b]/90 to-[#09090b]" />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-primary/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary shadow-[0_0_20px_rgba(59,130,246,0.6)]">
            <span className="text-sm font-black">N</span>
          </div>
          <span className="text-lg font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>NOVA</span>
        </header>

        <div className="mt-8 grid flex-1 items-center gap-10 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Premium Asian Drama Streaming
            </div>
            <h1 className="mb-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Every drama.<br />
              <span className="bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">One black canvas.</span>
            </h1>
            <p className="mb-6 max-w-md text-base text-white/70 sm:text-lg">
              Watch the best K-Dramas, J-Dramas, and C-Dramas in a beautifully crafted premium experience.
            </p>
            <div className="hidden gap-3 sm:flex">
              <div className="rounded-full glass px-3 py-1.5 text-xs">1080p / 4K</div>
              <div className="rounded-full glass px-3 py-1.5 text-xs">Continue on any device</div>
              <div className="rounded-full glass px-3 py-1.5 text-xs">No ads</div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md rounded-2xl glass-strong p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
            <div className="mb-5 flex items-center gap-1 rounded-lg bg-black/30 p-1">
              {(["signin","signup"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all ${mode === m ? "bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]" : "text-white/60 hover:text-white"}`}>
                  {m === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <input type="text" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30" />
              )}
              <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30" />
              <div className="relative">
                <input type={show ? "text" : "password"} required minLength={6} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 pr-11 text-sm outline-none placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center text-white/50 hover:text-white">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">{err}</div>}
              <button type="submit" disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all hover:brightness-110 disabled:opacity-60">
                <Play className="h-4 w-4 fill-current" />
                {loading ? "Please wait..." : mode === "signin" ? "Enter Nova" : "Create Account"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-white/40">
              <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
            </div>

            <button onClick={google} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95 0-3.28 2.63-5.95 5.85-5.95 1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.9 3.8 14.7 2.8 12 2.8c-5.05 0-9.15 4.1-9.15 9.15S6.95 21.1 12 21.1c5.28 0 8.78-3.71 8.78-8.94 0-.6-.07-1.06-.15-1.56z"/></svg>
              Continue with Google
            </button>

            <p className="mt-4 text-center text-xs text-white/40">By continuing you agree to our terms and privacy policy.</p>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-white/40">© {new Date().getFullYear()} Nova. All dramas are property of their respective owners.</footer>
      </div>
    </div>
  );
}
