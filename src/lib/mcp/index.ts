import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEventsTool from "./tools/list-events";
import createEventTool from "./tools/create-event";
import deleteEventTool from "./tools/delete-event";
import listListsTool from "./tools/list-lists";
import timeSinceTool from "./tools/time-since";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "quanto-tempo-mcp",
  title: "Quanto tempo? MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do app Quanto Tempo?: liste, crie e exclua datas importantes (aniversários, marcos, etc.) e calcule o tempo decorrido/faltante para qualquer data. Todas as ações operam sobre a conta do usuário conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEventsTool, createEventTool, deleteEventTool, listListsTool, timeSinceTool],
});