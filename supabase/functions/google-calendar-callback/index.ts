import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { escapeHtml, html, verifySignedState } from "../_shared/security.ts";

type OAuthState = {
  userId: string;
  redirectUrl?: string;
  iat?: number;
};

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return html("Método não permitido", 405);
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return html("<script>window.close();</script>Autorização negada.");
    }

    if (!code || !stateParam) {
      return html("Parâmetros inválidos", 400);
    }

    const stateSecret = Deno.env.get("OAUTH_STATE_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET");
    if (!stateSecret) {
      return html("OAuth state secret não configurado", 500);
    }

    const state = await verifySignedState<OAuthState>(stateParam, stateSecret);
    if (!state.userId || !state.iat || Date.now() - state.iat > 10 * 60 * 1000) {
      return html("Estado OAuth expirado ou inválido", 400);
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok) {
      return html(`Erro ao obter token: ${escapeHtml(tokens.error_description || tokens.error)}`, 502);
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    const { error: dbError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: state.userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (dbError) {
      return html(`Erro ao salvar token: ${escapeHtml(dbError.message)}`, 500);
    }

    const fallbackUrl = state.redirectUrl
      ? (() => {
          const u = new URL(state.redirectUrl);
          u.searchParams.set("gcal", "connected");
          return u.toString();
        })()
      : "";
    const fallbackJson = JSON.stringify(fallbackUrl);
    return html(`<script>
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage("gcal-connected", "*");
          window.close();
        } else if (${fallbackJson}) {
          window.location.href = ${fallbackJson};
        } else {
          document.body.innerText = "Google Calendar conectado. Pode fechar esta aba.";
        }
      } catch (e) {
        if (${fallbackJson}) window.location.href = ${fallbackJson};
      }
    </script>`);
  } catch (error) {
    return html(`Erro: ${escapeHtml((error as Error).message)}`, 500);
  }
});
