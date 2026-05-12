import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, json, methodNotAllowed } from "../_shared/security.ts";

type CalendarEventInput = {
  date?: string;
  label?: string;
  category?: string;
};

type SupabaseClient = ReturnType<typeof createClient>;
type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
};
type GoogleEventResponse = {
  id?: string;
  error?: { message?: string };
};

async function getValidToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: tokenData, error } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !tokenData) return null;

  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt > new Date(Date.now() + 60000)) {
    return tokenData.access_token;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: tokenData.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const newTokens = await res.json();
  if (!res.ok || !newTokens.access_token) return null;

  const newExpiry = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: newTokens.access_token,
      expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return newTokens.access_token;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Não autorizado" }, 401);
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const accessToken = await getValidToken(adminClient, user.id);
    if (!accessToken) {
      return json({ error: "Google Calendar não conectado", code: "NOT_CONNECTED" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "list-calendars") {
      const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Erro ao listar agendas");

      const calendars = (data.items || [])
        .filter((c: GoogleCalendarListItem) => c.accessRole === "owner" || c.accessRole === "writer")
        .map((c: GoogleCalendarListItem) => ({ id: c.id, summary: c.summary, primary: c.primary || false }));

      return json({ calendars });
    }

    if (action === "create-event") {
      const { calendarId, event, recurrence } = body;

      if (!calendarId || !isValidEvent(event)) {
        return json({ error: "Dados insuficientes" }, 400);
      }

      const result = await createGoogleEvent(accessToken, calendarId, event, recurrence);
      if (!result.ok) throw new Error(result.error || "Erro ao criar evento");

      return json({ success: true, eventId: result.eventId });
    }

    if (action === "create-events-batch") {
      const { calendarId, events, recurrence } = body;

      if (!calendarId || !Array.isArray(events) || events.length === 0 || events.length > 100) {
        return json({ error: "Dados insuficientes" }, 400);
      }

      const validEvents = events.filter(isValidEvent);
      if (validEvents.length !== events.length) {
        return json({ error: "Evento inválido na lista" }, 400);
      }

      const results = [];
      for (const event of validEvents) {
        const result = await createGoogleEvent(accessToken, calendarId, event, recurrence);
        results.push({ label: event.label, success: result.ok, error: result.error });
      }

      return json({ results });
    }

    if (action === "check-connection") {
      return json({ connected: true });
    }

    if (action === "disconnect") {
      await adminClient
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", user.id);

      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

function isValidEvent(event: unknown): event is Required<CalendarEventInput> {
  if (!event || typeof event !== "object") return false;
  const item = event as CalendarEventInput;
  return typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(item.date) &&
    typeof item.label === "string" &&
    item.label.trim().length > 0 &&
    item.label.length <= 200 &&
    typeof item.category === "string" &&
    item.category.length <= 120;
}

async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: Required<CalendarEventInput>,
  recurrence: unknown,
) {
  const eventDate = event.date.split("T")[0];
  const calendarEvent: {
    summary: string;
    description: string;
    start: { date: string };
    end: { date: string };
    transparency: string;
    recurrence?: string[];
  } = {
    summary: event.label,
    description: `Categoria: ${event.category}\nRegistrado em "Quanto Tempo Faz"`,
    start: { date: eventDate },
    end: { date: eventDate },
    transparency: "transparent",
  };

  if (recurrence === "yearly") {
    calendarEvent.recurrence = ["RRULE:FREQ=YEARLY"];
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEvent),
    },
  );

  const data = await res.json() as GoogleEventResponse;
  return {
    ok: res.ok,
    eventId: data.id as string | undefined,
    error: data.error?.message as string | undefined,
  };
}
