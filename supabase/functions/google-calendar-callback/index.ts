import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return htmlPage("Autorização negada.", true);
    }

    if (!code || !stateParam) {
      return new Response("Parâmetros inválidos", { status: 400 });
    }

    const parsed = await verifyState(stateParam);
    if (!parsed) {
      return new Response("Estado inválido", { status: 400 });
    }
    const userId: string = parsed.userId;
    const redirectUrl: string = sanitizeRedirect(parsed.redirectUrl);

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
      console.error("google-calendar-callback token error", tokens);
      return htmlPage("Erro ao obter token do Google.", false);
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
      console.error("google-calendar-callback db error", dbError);
      return htmlPage("Erro ao salvar conexão.", false);
    }

    if (redirectUrl) {
      const target = new URL(redirectUrl);
      target.searchParams.set("gcal", "connected");
      return Response.redirect(target.toString(), 302);
    }
    // Popup flow: postMessage to opener, then close. Static HTML, no interpolation.
    const html = `<!doctype html><html><body><script>
if(window.opener){window.opener.postMessage("gcal-connected","*");window.close();}
else{document.body.innerText="Google Calendar conectado! Pode fechar esta aba.";}
</script></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("google-calendar-callback error", error);
    return new Response("Erro interno", { status: 500 });
  }
});

function htmlPage(message: string, closeWindow: boolean) {
  // Static text only — message is hard-coded by us, never user input.
  const safe = message.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
  const close = closeWindow ? `<script>setTimeout(()=>window.close(),1500)</script>` : "";
  return new Response(
    `<!doctype html><html><body>${safe}${close}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function sanitizeRedirect(url: unknown): string {
  if (typeof url !== "string" || !url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname;
    const ok =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovable.dev") ||
      host.endsWith(".lovableproject.com");
    if (!ok) return "";
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.toString();
  } catch {
    return "";
  }
}

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyState(state: string): Promise<{ userId: string; redirectUrl: string } | null> {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  let payload: string;
  try {
    payload = b64urlDecode(payloadB64);
  } catch {
    return null;
  }
  const expected = await hmac(payload);
  // constant-time compare
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const obj = JSON.parse(payload);
    // 10-minute TTL
    if (typeof obj.iat === "number" && Date.now() - obj.iat > 10 * 60 * 1000) return null;
    if (typeof obj.userId !== "string") return null;
    return { userId: obj.userId, redirectUrl: typeof obj.redirectUrl === "string" ? obj.redirectUrl : "" };
  } catch {
    return null;
  }
}
