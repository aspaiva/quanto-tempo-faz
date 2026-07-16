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
  name: "list_events",
  title: "Listar eventos",
  description: "Lista os eventos (datas importantes) do usuário autenticado, opcionalmente filtrando por categoria ou favoritos.",
  inputSchema: {
    category: z.string().optional().describe("Filtro opcional pela categoria exata do evento."),
    onlyFavorites: z.boolean().optional().describe("Se true, retorna somente eventos marcados como favoritos."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de eventos a retornar (padrão 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, onlyFavorites, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("events")
      .select("id, label, category, date, recurring, favorite")
      .eq("user_id", ctx.getUserId())
      .order("date", { ascending: true })
      .limit(limit ?? 100);
    if (category) query = query.eq("category", category);
    if (onlyFavorites) query = query.eq("favorite", true);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [] },
    };
  },
});