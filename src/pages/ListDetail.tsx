import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Clock, LayoutGrid, List as ListIcon, PlusCircle, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EventCard } from "@/components/EventCard";
import { EventListItem } from "@/components/EventListItem";
import { DateEvent, saveEvent } from "@/lib/events";
import { EventFormDialog } from "@/components/EventFormDialog";
import { getListEvents, addEventToList, removeEventFromList } from "@/lib/lists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleCalendarDialog } from "@/components/GoogleCalendarDialog";

type ViewMode = "cards" | "list";

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

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Auto-join if user accessed via shared link and is not yet a member/owner
        const { data: listCheck } = await supabase
          .from("lists")
          .select("owner_id")
          .eq("id", id)
          .single();

        if (listCheck && listCheck.owner_id !== user.id) {
          const { data: membership } = await supabase
            .from("list_members")
            .select("id")
            .eq("list_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!membership) {
            try {
              await supabase.rpc("join_list", { _list_id: id });
              toast.success("Você entrou na lista!");
            } catch {
              // ignore if already member
            }
          }
        }

        const [listRes, eventIds] = await Promise.all([
          supabase.from("lists").select("name, owner_id").eq("id", id).single(),
          getListEvents(id),
        ]);
        if (listRes.error) throw listRes.error;
        setListName(listRes.data.name);
        setListOwnerId(listRes.data.owner_id);

        // Load events that are in the list (RLS now allows seeing shared events)
        if (eventIds.length > 0) {
          const { data: evts, error } = await supabase
            .from("events")
            .select("id, label, category, date, user_id")
            .in("id", eventIds);
          if (error) throw error;
          setListEvents((evts || []) as ListEventWithOwner[]);
        } else {
          setListEvents([]);
        }

        // Load user's own events for the "add" dialog
        const { data: myEvts, error: myErr } = await supabase
          .from("events")
          .select("id, label, category, date")
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
        .select("id, label, category, date, user_id")
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
        .select("id, label, category, date, user_id")
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
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5">
            <Button onClick={() => navigate("/lists")} variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-foreground truncate">{listName}</h1>
          </div>
          <div className="flex items-center gap-2">
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
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar evento
            </Button>
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
            {listEvents.map((event) => (
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
            {listEvents.map((event) => (
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
                    <p className="text-xs text-muted-foreground">{event.category} · {new Date(event.date).toLocaleDateString("pt-BR")}</p>
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
    </div>
  );
};

export default ListDetail;
