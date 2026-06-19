import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Clock, LayoutGrid, List as ListIcon, PlusCircle, CalendarPlus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EventCard } from "@/components/EventCard";
import { EventListItem } from "@/components/EventListItem";
import { DateEvent, saveEvent, totalDays } from "@/lib/events";
import { parseLocalDate } from "@/lib/utils";
import { EventFormDialog } from "@/components/EventFormDialog";
import { getListEvents, addEventToList, removeEventFromList } from "@/lib/lists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleCalendarDialog } from "@/components/GoogleCalendarDialog";
import { SEO } from "@/components/SEO";
import { HelpButton } from "@/features/help/HelpButton";

type ViewMode = "cards" | "list";
type SortOrder = "closest" | "farthest";

interface ListEventWithOwner extends DateEvent {
  user_id: string;
}

const ListDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listName, setListName] = useState("");
  const [listOwnerId, setListOwnerId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [listEvents, setListEvents] = useState<ListEventWithOwner[]>([]);
  const [userEvents, setUserEvents] = useState<DateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [gcalBatchOpen, setGcalBatchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("closest");

  const sortedListEvents = useMemo(() => {
    const now = Date.now();
    const sorted = [...listEvents].sort((a, b) => {
      const aFuture = new Date(a.date).getTime() > now ? 0 : 1;
      const bFuture = new Date(b.date).getTime() > now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      const diff = totalDays(a.date) - totalDays(b.date);
      return sortOrder === "farthest" ? -diff : diff;
    });
    return sorted;
  }, [listEvents, sortOrder]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Try to fetch the list. If RLS blocks it (user is not yet owner/member),
        // attempt auto-join then retry. join_list is SECURITY DEFINER and handles
        // the "already owner / already member" cases internally.
        let listRes = await supabase
          .from("lists")
          .select("name, owner_id")
          .eq("id", id)
          .maybeSingle();

        if (!listRes.data) {
          const { error: joinErr } = await supabase.rpc("join_list", { _list_id: id });
          if (joinErr) {
            // Lista realmente não existe ou outro erro
            const msg = joinErr.message?.includes("não encontrada")
              ? "Lista não encontrada"
              : "Não foi possível acessar esta lista";
            toast.error(msg);
            setLoading(false);
            return;
          }
          toast.success("Você entrou na lista!");
          listRes = await supabase
            .from("lists")
            .select("name, owner_id")
            .eq("id", id)
            .maybeSingle();
        }

        if (!listRes.data) {
          toast.error("Lista não encontrada");
          setLoading(false);
          return;
        }
        setListName(listRes.data.name);
        setListOwnerId(listRes.data.owner_id);

        const eventIds = await getListEvents(id);

        // Load events that are in the list (RLS now allows seeing shared events)
        if (eventIds.length > 0) {
          const { data: evts, error } = await supabase
            .from("events")
            .select("id, label, category, date, recurring, user_id")
            .in("id", eventIds);
          if (error) throw error;
          setListEvents((evts || []) as ListEventWithOwner[]);
        } else {
          setListEvents([]);
        }

        // Load user's own events for the "add" dialog
        const { data: myEvts, error: myErr } = await supabase
          .from("events")
          .select("id, label, category, date, recurring")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (myErr) throw myErr;
        setUserEvents(myEvts || []);
      } catch {
        toast.error("Erro ao carregar lista");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const listEventIds = listEvents.map((e) => e.id);
  const availableEvents = userEvents.filter((e) => !listEventIds.includes(e.id));

  const canRemoveEvent = (event: ListEventWithOwner) => {
    // List owner can remove any event; event owner can remove their own
    return currentUserId === listOwnerId || currentUserId === event.user_id;
  };

  const handleNewEventSave = async (data: Omit<DateEvent, "id"> & { id?: string }) => {
    if (!id) return;
    try {
      const saved = await saveEvent(data);
      setUserEvents((prev) => [saved, ...prev]);
      await addEventToList(id, saved.id);
      const { data: full } = await supabase
        .from("events")
        .select("id, label, category, date, recurring, user_id")
        .eq("id", saved.id)
        .single();
      if (full) setListEvents((prev) => [...prev, full as ListEventWithOwner]);
      toast.success("Evento criado e adicionado à lista");
    } catch {
      toast.error("Erro ao criar evento");
    }
  };

  const handleAdd = async (eventId: string) => {
    if (!id) return;
    try {
      await addEventToList(id, eventId);
      // Reload the event data
      const { data } = await supabase
        .from("events")
        .select("id, label, category, date, recurring, user_id")
        .eq("id", eventId)
        .single();
      if (data) setListEvents((prev) => [...prev, data as ListEventWithOwner]);
      toast.success("Evento adicionado à lista");
    } catch {
      toast.error("Erro ao adicionar evento");
    }
  };

  const handleRemove = async (eventId: string) => {
    if (!id) return;
    try {
      await removeEventFromList(id, eventId);
      setListEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success("Evento removido da lista");
    } catch {
      toast.error("Erro ao remover evento");
    } finally {
      setConfirmRemoveId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <SEO
        title={`${listName || "Lista"} — Quanto tempo?`}
        description="Eventos de uma lista compartilhada no Quanto tempo?."
        path="/lists"
        noindex
      />
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Button onClick={() => navigate("/lists")} variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-foreground truncate">{listName}</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <div className="flex rounded-md border border-border">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => setSortOrder(s => s === "closest" ? "farthest" : "closest")}
              variant="outline"
              size="sm"
              className="gap-1.5"
              title={sortOrder === "closest" ? "Mais próximos primeiro" : "Mais distantes primeiro"}
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">{sortOrder === "closest" ? "Próximos" : "Distantes"}</span>
            </Button>
            {listEvents.length > 0 && (
              <Button onClick={() => setGcalBatchOpen(true)} variant="outline" size="sm" className="gap-1.5" title="Adicionar todos ao Google Calendar">
                <CalendarPlus className="h-4 w-4" /> <span className="hidden sm:inline">Google Calendar</span>
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Adicionar evento</span>
            </Button>
            <HelpButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : listEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-full bg-secondary p-5">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">Lista vazia</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Adicione seus eventos a esta lista.
            </p>
            <Button onClick={() => setAddOpen(true)} className="mt-6 gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar evento
            </Button>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedListEvents.map((event) => (
              <div key={event.id} className="relative">
                <EventCard event={event} onEdit={() => {}} onDelete={() => {}} hideActions />
                {canRemoveEvent(event) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-destructive hover:text-destructive bg-card/80"
                    onClick={() => setConfirmRemoveId(event.id)}
                    title="Remover da lista"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedListEvents.map((event) => (
              <div key={event.id} className="relative">
                <EventListItem event={event} onEdit={() => {}} onDelete={() => {}} hideActions />
                {canRemoveEvent(event) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 -translate-y-1/2 right-2 h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setConfirmRemoveId(event.id)}
                    title="Remover da lista"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add event to list dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="font-body sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Adicionar evento à lista</DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={() => {
                setAddOpen(false);
                setNewEventOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4" /> Cadastrar novo evento
            </Button>
          </div>
          {availableEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todos os seus eventos já estão nesta lista, ou você ainda não cadastrou eventos.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {availableEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    handleAdd(event.id);
                    setAddOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.category} · {parseLocalDate(event.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Confirm removal dialog */}
      <AlertDialog open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <AlertDialogContent className="font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Remover evento da lista?</AlertDialogTitle>
            <AlertDialogDescription>
              O evento será removido desta lista, mas continuará existindo na conta do proprietário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EventFormDialog open={newEventOpen} onOpenChange={setNewEventOpen} onSave={handleNewEventSave} editEvent={null} />
      <GoogleCalendarDialog open={gcalBatchOpen} onOpenChange={setGcalBatchOpen} events={listEvents} mode="batch" />
    </div>
  );
};

export default ListDetail;
