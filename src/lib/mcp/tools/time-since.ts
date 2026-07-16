import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function diff(a: Date, b: Date) {
  const [earlier, later] = a > b ? [b, a] : [a, b];
  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  let days = later.getDate() - earlier.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(later.getFullYear(), later.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months, days };
}

export default defineTool({
  name: "time_since",
  title: "Calcular tempo desde/até uma data",
  description: "Calcula o tempo decorrido ou faltante (anos, meses, dias e total de dias) entre hoje e uma data informada.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD").describe("Data no formato YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ date }) => {
    const target = parseLocalDate(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isFuture = target.getTime() > today.getTime();
    const parts = diff(target, today);
    const totalDays = Math.round(Math.abs(target.getTime() - today.getTime()) / 86400000);
    const result = { direction: isFuture ? "future" : "past", ...parts, totalDays };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});