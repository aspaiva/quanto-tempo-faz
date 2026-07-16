import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_event",
  title: "Criar evento",
  description: "Cria uma nova data/evento para o usuário autenticado no app Quanto Tempo?",
  inputSchema: {
    label: z.string().trim().min(1).max(200).describe("Nome/descrição do evento."),
    category: z.string().trim().min(1).max(120).describe("Categoria do evento (ex.: 'Aniversário de casamento')."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD").describe("Data do evento no formato ISO (YYYY-MM-DD)."),
    recurring: z.boolean().optional().describe("Se o evento se repete anualmente."),
    favorite: z.boolean().optional().describe("Marcar como favorito."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ label, category, date, recurring, favorite }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("events")
      .insert({
        user_id: ctx.getUserId(),
        label,
        category,
        date,
        recurring: recurring ?? false,
        favorite: favorite ?? false,
      })
      .select("id, label, category, date, recurring, favorite")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});