import { supabase } from "@/integrations/supabase/client";
import { DateEvent } from "./events";

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

async function callGCalApi(action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const { data, error } = await supabase.functions.invoke("google-calendar-api", {
    body: { action, ...extra },
  });

  if (error) throw new Error(error.message);
  if (data?.error) {
    if (data.code === "NOT_CONNECTED") throw new Error("NOT_CONNECTED");
    throw new Error(data.error);
  }
  return data;
}

export async function checkGCalConnection(): Promise<boolean> {
  try {
    const data = await callGCalApi("check-connection");
    return data?.connected === true;
  } catch {
    return false;
  }
}

export async function disconnectGCal(): Promise<void> {
  await callGCalApi("disconnect");
}

export async function listCalendars(): Promise<GoogleCalendar[]> {
  const data = await callGCalApi("list-calendars");
  return data.calendars || [];
}

export async function createGCalEvent(
  calendarId: string,
  event: DateEvent,
  recurrence: "once" | "yearly"
): Promise<void> {
  await callGCalApi("create-event", { calendarId, event, recurrence });
}

export async function createGCalEventsBatch(
  calendarId: string,
  events: DateEvent[],
  recurrence: "once" | "yearly"
): Promise<{ label: string; success: boolean; error?: string }[]> {
  const data = await callGCalApi("create-events-batch", { calendarId, events, recurrence });
  return data.results || [];
}

export async function getGCalAuthUrl(redirectUrl: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
    body: { redirectUrl },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.url;
}
