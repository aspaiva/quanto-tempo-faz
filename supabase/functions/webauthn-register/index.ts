import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
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
  try {
    const u = new URL(origin);
    rpID = u.hostname;
  } catch (_) { /* noop */ }
  return { origin, rpID };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Sessão inválida" }, 401);

    const userId = userData.user.id;
    const email = userData.user.email ?? "usuario";

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "options" | "verify";
    const { origin, rpID } = getRpInfo(req);

    if (action === "options") {
      // Existing credentials to exclude
      const { data: existing } = await adminClient
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", userId);

      const options = await generateRegistrationOptions({
        rpName: "Quanto tempo?",
        rpID,
        userID: new TextEncoder().encode(userId),
        userName: email,
        userDisplayName: email,
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((c) => ({
          id: c.credential_id,
          transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      await adminClient.from("webauthn_challenges").insert({
        challenge: options.challenge,
        user_id: userId,
        type: "registration",
      });

      return json({ options });
    }

    if (action === "verify") {
      const response = body?.response;
      const deviceName = (body?.deviceName as string)?.slice(0, 80) || "Dispositivo";
      if (!response?.response?.clientDataJSON) {
        return json({ error: "Resposta inválida" }, 400);
      }

      // Decode client data to read challenge
      const clientData = JSON.parse(
        atob(response.response.clientDataJSON.replace(/-/g, "+").replace(/_/g, "/")),
      );
      const challenge = clientData.challenge as string;

      const { data: chRow } = await adminClient
        .from("webauthn_challenges")
        .select("*")
        .eq("challenge", challenge)
        .eq("type", "registration")
        .eq("user_id", userId)
        .maybeSingle();

      if (!chRow || new Date(chRow.expires_at) < new Date()) {
        return json({ error: "Desafio expirado. Tente novamente." }, 400);
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "Não foi possível confirmar o dispositivo" }, 400);
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const insertRes = await adminClient.from("webauthn_credentials").insert({
        user_id: userId,
        credential_id: credential.id,
        public_key: btoa(String.fromCharCode(...credential.publicKey)),
        counter: credential.counter ?? 0,
        transports: credential.transports ?? [],
        device_name: deviceName,
        device_type: credentialDeviceType,
        backed_up: !!credentialBackedUp,
      });

      await adminClient
        .from("webauthn_challenges")
        .delete()
        .eq("challenge", challenge);

      if (insertRes.error) return json({ error: insertRes.error.message }, 400);
      return json({ verified: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("webauthn-register error", e);
    return json({ error: (e as Error).message ?? "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AuthenticatorTransportFuture =
  | "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";