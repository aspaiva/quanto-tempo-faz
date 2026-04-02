import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(`<html><body><script>window.close();</script>Autorização negada.</body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response("Parâmetros inválidos", { status: 400 });
    }

    const state = JSON.parse(atob(stateParam));
    const userId = state.userId;
    const redirectUrl = state.redirectUrl || "";

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
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
      return new Response(`<html><body>Erro ao obter token: ${tokens.error_description || tokens.error}</body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    const { error: dbError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (dbError) {
      return new Response(`<html><body>Erro ao salvar token: ${dbError.message}</body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Redirect back or close window
    const html = redirectUrl
      ? `<html><body><script>window.location.href="${redirectUrl}?gcal=connected";</script></body></html>`
      : `<html><body><script>if(window.opener){window.opener.postMessage("gcal-connected","*");window.close();}else{document.body.innerText="Google Calendar conectado! Pode fechar esta aba.";}</script></body></html>`;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    return new Response(`<html><body>Erro: ${(error as Error).message}</body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }
});
