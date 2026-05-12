import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, createSignedState, json, methodNotAllowed, sanitizeRedirectUrl } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") return methodNotAllowed();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Não autorizado" }, 401);
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!clientId) {
      return json({ error: "Google Client ID não configurado" }, 500);
    }

    const { redirectUrl } = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;
    const appOrigin = req.headers.get("origin") ?? new URL(redirectUrl || "http://localhost").origin;
    const sanitizedRedirectUrl = sanitizeRedirectUrl(redirectUrl, appOrigin);
    const stateSecret = Deno.env.get("OAUTH_STATE_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET");

    if (!stateSecret) {
      return json({ error: "OAuth state secret não configurado" }, 500);
    }

    const state = await createSignedState(
      { userId: user.id, redirectUrl: sanitizedRedirectUrl, iat: Date.now() },
      stateSecret,
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
