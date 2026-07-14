import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/utils";

export interface DateEvent {
  id: string;
  label: string;
  category: string;
  date: string; // ISO string
  recurring?: boolean;
  favorite?: boolean;
}

export const EVENT_CATEGORIES = [
  { group: "Família", items: ["Casamento", "Nascimento de filho(a)", "Nascimento de neto(a)", "Aniversário de casamento", "Noivado", "Adoção", "Reunião familiar"] },
  { group: "Pessoal", items: ["Meu nascimento", "Batismo", "Primeira comunhão", "Confirmação/Crisma", "Bar/Bat Mitzvá", "Mudança de cidade", "Mudança de país", "Aposentadoria"] },
  { group: "Educação", items: ["Formatura ensino médio", "Início da faculdade", "Formatura faculdade", "Mestrado", "Doutorado", "MBA", "Certificação profissional", "Prova"] },
  { group: "Carreira", items: ["Primeiro emprego", "Promoção", "Novo emprego", "Abertura de empresa", "Sociedade", "Demissão", "Início de projeto", "Concurso"] },
  { group: "Saúde", items: ["Cirurgia", "Alta médica", "Início de tratamento", "Fim de tratamento", "Sobriedade", "Dia sem fumar"] },
  { group: "Relacionamentos", items: ["Primeiro encontro", "Início do namoro", "Pedido de casamento", "Aniversário de casamento", "Separação", "Reconciliação", "Amizade especial", "Nascimento de amigo"] },
  { group: "Conquistas", items: ["Compra da casa", "Compra do carro", "Primeira viagem internacional", "Maratona", "Publicação de livro", "Prêmio recebido", "Meta alcançada"] },
  { group: "Momentos especiais", items: ["Viagem inesquecível", "Show marcante", "Dia mais feliz", "Superação pessoal", "Voluntariado", "Evento religioso", "Outro"] },
];

export function isFutureEvent(dateStr: string): boolean {
  const d = parseLocalDate(dateStr);
  const now = new Date();
  return d.getTime() > now.getTime();
}

export function calculateTimeSince(dateStr: string): { years: number; months: number; days: number } {
  const target = parseLocalDate(dateStr);
  const now = new Date();

  // For future dates, swap so we calculate the difference correctly
  const [earlier, later] = target > now ? [now, target] : [target, now];

  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  let days = later.getDate() - earlier.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

export function totalDays(dateStr: string): number {
  const target = parseLocalDate(dateStr);
  const now = new Date();
  const diff = Math.abs(now.getTime() - target.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * For a recurring event (yearly), returns the next anniversary date from today.
 * If today is the anniversary, returns today.
 */
export function nextOccurrence(dateStr: string): Date {
  const original = parseLocalDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let candidate = new Date(today.getFullYear(), original.getMonth(), original.getDate());
  if (candidate.getTime() < today.getTime()) {
    candidate = new Date(today.getFullYear() + 1, original.getMonth(), original.getDate());
  }
  return candidate;
}

export function daysUntilNextOccurrence(dateStr: string): number {
  const next = nextOccurrence(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = next.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Days until the next upcoming occurrence of the event, regardless of year.
 * - Recurring events: days until next anniversary.
 * - Non-recurring future events: days until the date.
 * - Non-recurring past events: days until the same month/day next occurrence
 *   (treated like an anniversary so users can see the date approaching).
 */
export function daysUntilUpcoming(dateStr: string, recurring?: boolean): number {
  const target = parseLocalDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!recurring && target.getTime() >= today.getTime()) {
    const diff = target.getTime() - today.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }
  return daysUntilNextOccurrence(dateStr);
}

export async function loadEvents(): Promise<DateEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("events")
    .select("id, label, category, date, recurring, favorite")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((e) => ({ ...e, date: e.date, recurring: !!e.recurring, favorite: !!e.favorite }));
}

export async function saveEvent(event: Omit<DateEvent, "id"> & { id?: string }): Promise<DateEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  if (event.id) {
    const { data, error } = await supabase
      .from("events")
      .update({ label: event.label, category: event.category, date: event.date, recurring: !!event.recurring, favorite: !!event.favorite })
      .eq("id", event.id)
      .select("id, label, category, date, recurring, favorite")
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ label: event.label, category: event.category, date: event.date, recurring: !!event.recurring, favorite: !!event.favorite, user_id: user.id })
      .select("id, label, category, date, recurring, favorite")
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function setEventFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from("events").update({ favorite }).eq("id", id);
  if (error) throw error;
}
