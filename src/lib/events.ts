export interface DateEvent {
  id: string;
  label: string;
  category: string;
  date: string; // ISO string
}

export const EVENT_CATEGORIES = [
  { group: "Família", items: ["Casamento", "Nascimento de filho(a)", "Nascimento de neto(a)", "Aniversário de casamento", "Noivado", "Adoção", "Reunião familiar"] },
  { group: "Pessoal", items: ["Meu nascimento", "Batismo", "Primeira comunhão", "Confirmação/Crisma", "Bar/Bat Mitzvá", "Mudança de cidade", "Mudança de país", "Aposentadoria"] },
  { group: "Educação", items: ["Formatura ensino médio", "Início da faculdade", "Formatura faculdade", "Mestrado", "Doutorado", "MBA", "Certificação profissional"] },
  { group: "Carreira", items: ["Primeiro emprego", "Promoção", "Novo emprego", "Abertura de empresa", "Sociedade", "Demissão", "Início de projeto"] },
  { group: "Saúde", items: ["Cirurgia", "Alta médica", "Início de tratamento", "Fim de tratamento", "Sobriedade", "Dia sem fumar"] },
  { group: "Relacionamentos", items: ["Primeiro encontro", "Início do namoro", "Pedido de casamento", "Separação", "Reconciliação", "Amizade especial"] },
  { group: "Conquistas", items: ["Compra da casa", "Compra do carro", "Primeira viagem internacional", "Maratona", "Publicação de livro", "Prêmio recebido", "Meta alcançada"] },
  { group: "Momentos especiais", items: ["Viagem inesquecível", "Show marcante", "Dia mais feliz", "Superação pessoal", "Voluntariado", "Evento religioso", "Outro"] },
];

export function calculateTimeSince(dateStr: string): { years: number; months: number; days: number } {
  const past = new Date(dateStr);
  const now = new Date();

  let years = now.getFullYear() - past.getFullYear();
  let months = now.getMonth() - past.getMonth();
  let days = now.getDate() - past.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

export function totalDays(dateStr: string): number {
  const past = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - past.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function loadEvents(): DateEvent[] {
  try {
    return JSON.parse(localStorage.getItem("qtf-events") || "[]");
  } catch { return []; }
}

export function saveEvents(events: DateEvent[]) {
  localStorage.setItem("qtf-events", JSON.stringify(events));
}
