import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@13.1.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getRpInfo(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  let rpID = "localhost";
  try { rpID = new URL(origin).hostname; } catch (_) { /* noop */ }
  return { origin, rpID };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "options" | "verify";
    const { origin, rpID } = getRpInfo(req);

    if (action === "options") {
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
        // Discoverable credentials: empty allowCredentials lets the device choose
        allowCredentials: [],
      });

      await adminClient.from("webauthn_challenges").insert({
        challenge: options.challenge,
        type: "authentication",
      });

      return json({ options });
    }

    if (action === "verify") {
      const response = body?.response;
      if (!response?.id || !response?.response?.clientDataJSON) {
        return json({ error: "Resposta inválida" }, 400);
      }

      const clientData = JSON.parse(
        atob(response.response.clientDataJSON.replace(/-/g, "+").replace(/_/g, "/")),
      );
      const challenge = clientData.challenge as string;

      const { data: chRow } = await adminClient
        .from("webauthn_challenges")
        .select("*")
        .eq("challenge", challenge)
        .eq("type", "authentication")
        .maybeSingle();

      if (!chRow || new Date(chRow.expires_at) < new Date()) {
        return json({ error: "Desafio expirado. Tente novamente." }, 400);
      }

      // Find credential
      const { data: cred } = await adminClient
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", response.id)
        .maybeSingle();
      if (!cred) return json({ error: "Dispositivo não reconhecido" }, 404);

      const publicKeyBytes = Uint8Array.from(atob(cred.public_key), (c) => c.charCodeAt(0));

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: cred.credential_id,
          publicKey: publicKeyBytes,
          counter: Number(cred.counter ?? 0),
          transports: cred.transports ?? undefined,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        return json({ error: "Falha na verificação biométrica" }, 401);
      }

      // Update counter & last_used_at
      await adminClient
        .from("webauthn_credentials")
        .update({
          counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", cred.id);

      await adminClient
        .from("webauthn_challenges")
        .delete()
        .eq("challenge", challenge);

      // Get user email and generate magic link to deliver a session
      const { data: userRes, error: userErr } = await adminClient.auth.admin.getUserById(
        cred.user_id,
      );
      if (userErr || !userRes?.user?.email) {
        return json({ error: "Usuário não encontrado" }, 404);
      }

      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: userRes.user.email,
      });
      if (linkErr || !linkData?.properties) {
        return json({ error: linkErr?.message ?? "Falha ao iniciar sessão" }, 500);
      }

      // hashed_token + email + type=magiclink → client trades via verifyOtp
      return json({
        verified: true,
        email: userRes.user.email,
        token_hash: linkData.properties.hashed_token,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("webauthn-authenticate error", e);
    return json({ error: "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}