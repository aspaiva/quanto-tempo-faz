import { supabase } from "@/integrations/supabase/client";

export interface EventList {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  is_owner: boolean;
  event_count?: number;
}

export async function loadLists(): Promise<EventList[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Own lists
  const { data: ownLists, error: e1 } = await supabase
    .from("lists")
    .select("id, name, owner_id, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (e1) throw e1;

  // Shared lists (member)
  const { data: memberships, error: e2 } = await supabase
    .from("list_members")
    .select("list_id")
    .eq("user_id", user.id);
  if (e2) throw e2;

  let sharedLists: any[] = [];
  if (memberships && memberships.length > 0) {
    const ids = memberships.map((m) => m.list_id);
    const { data, error } = await supabase
      .from("lists")
      .select("id, name, owner_id, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) throw error;
    sharedLists = data || [];
  }

  // Get event counts
  const allIds = [...(ownLists || []), ...sharedLists].map((l) => l.id);
  let countMap: Record<string, number> = {};
  if (allIds.length > 0) {
    const { data: listEvents } = await supabase
      .from("list_events")
      .select("list_id")
      .in("list_id", allIds);
    if (listEvents) {
      for (const le of listEvents) {
        countMap[le.list_id] = (countMap[le.list_id] || 0) + 1;
      }
    }
  }

  return [
    ...(ownLists || []).map((l) => ({ ...l, is_owner: true, event_count: countMap[l.id] || 0 })),
    ...sharedLists.map((l) => ({ ...l, is_owner: false, event_count: countMap[l.id] || 0 })),
  ];
}

export async function createList(name: string): Promise<EventList> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("lists")
    .insert({ name, owner_id: user.id })
    .select("id, name, owner_id, created_at")
    .single();
  if (error) throw error;
  return { ...data, is_owner: true, event_count: 0 };
}

export async function updateList(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("lists").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw error;
}

export async function addEventToList(listId: string, eventId: string): Promise<void> {
  const { error } = await supabase.from("list_events").insert({ list_id: listId, event_id: eventId });
  if (error) throw error;
}

export async function removeEventFromList(listId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from("list_events")
    .delete()
    .eq("list_id", listId)
    .eq("event_id", eventId);
  if (error) throw error;
}

export async function getListEvents(listId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("list_events")
    .select("event_id")
    .eq("list_id", listId);
  if (error) throw error;
  return (data || []).map((d) => d.event_id);
}

export async function joinListById(listId: string): Promise<void> {
  const { error } = await supabase.rpc("join_list", { _list_id: listId });
  if (error) {
    throw new Error(error.message || "Erro ao entrar na lista");
  }
}
