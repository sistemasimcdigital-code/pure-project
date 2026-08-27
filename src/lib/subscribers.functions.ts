import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InviteResult = {
  ok: boolean;
  code:
    | "invited"
    | "existing_user"
    | "invalid_email"
    | "forbidden"
    | "rate_limited"
    | "email_failed"
    | "failed";
  expires_at?: string;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const activateAndInviteSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; expiresAt?: string | null; redirectTo: string }) => input)
  .handler(async ({ data, context }): Promise<InviteResult> => {
    const email = data.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 255) {
      return { ok: false, code: "invalid_email", message: "E-mail inválido." };
    }

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) {
      return { ok: false, code: "forbidden", message: "Ação não permitida." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Limite de envios: no máximo 10 convites por administrador em 10 minutos.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("subscription_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", context.userId)
      .eq("action", "admin_invite_subscriber")
      .gte("created_at", since);
    if ((count ?? 0) >= 10) {
      return {
        ok: false,
        code: "rate_limited",
        message: "Muitos envios recentes. Aguarde alguns minutos e tente novamente.",
      };
    }

    // Localiza a conta existente pelo e-mail (nunca duplica conta).
    let userId: string | null = null;
    for (let page = 1; page <= 20 && !userId; page += 1) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) userId = found.id;
      if (list.users.length < 200) break;
    }

    const isNewUser = !userId;
    let emailSent = true;

    if (isNewUser) {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: data.redirectTo,
      });
      if (error || !invited?.user) {
        await supabaseAdmin.from("subscription_audit_log").insert({
          actor_id: context.userId,
          action: "admin_invite_subscriber_failed",
          metadata: { email_domain: email.split("@")[1] ?? null, reason: "invite_failed" },
        });
        return {
          ok: false,
          code: "email_failed",
          message: "Não foi possível enviar o convite. Verifique a configuração de e-mail (SMTP).",
        };
      }
      userId = invited.user.id;
    }

    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, started_at, status")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: expiresAt,
          cancelled_at: null,
          started_at: existingSub.status === "active" ? existingSub.started_at : new Date().toISOString(),
        })
        .eq("id", existingSub.id);
      if (error) return { ok: false, code: "failed", message: "Não foi possível ativar o acesso." };
    } else {
      const { error } = await supabaseAdmin.from("subscriptions").insert({
        user_id: userId!,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
      if (error) return { ok: false, code: "failed", message: "Não foi possível ativar o acesso." };
    }

    if (!isNewUser) {
      // Conta já existente: envia link seguro de acesso, sem criar conta nova.
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: data.redirectTo },
      });
      emailSent = !error;
    }

    await supabaseAdmin.from("subscription_audit_log").insert({
      actor_id: context.userId,
      target_user_id: userId,
      action: "admin_invite_subscriber",
      metadata: {
        new_account: isNewUser,
        email_sent: emailSent,
        expires_at: expiresAt,
      },
    });

    if (isNewUser) {
      return {
        ok: true,
        code: "invited",
        expires_at: expiresAt,
        message: "Convite enviado. O assinante precisa aceitar o convite e concluir o cadastro.",
      };
    }
    return {
      ok: true,
      code: "existing_user",
      expires_at: expiresAt,
      message: emailSent
        ? "Acesso ativado. Um link seguro de acesso foi enviado."
        : "Acesso ativado, mas o envio do e-mail falhou. Verifique a configuração de e-mail.",
    };
  });
