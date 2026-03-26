import { useState, useEffect } from "react";
import { Plus, Clock, LogOut, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { EventListItem } from "@/components/EventListItem";
import { EventFormDialog } from "@/components/EventFormDialog";
import { DateEvent, loadEvents, saveEvent, deleteEvent } from "@/lib/events";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ViewMode = "cards" | "list";

const Index = () => {
  const [events, setEvents] = useState<DateEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<DateEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch(() => toast.error("Erro ao carregar eventos"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (data: Omit<DateEvent, "id"> & { id?: string }) => {
    try {
      const saved = await saveEvent(data);
      if (data.id) {
        setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
      } else {
        setEvents((prev) => [saved, ...prev]);
      }
      setEditEvent(null);
    } catch {
      toast.error("Erro ao salvar evento");
    }
  };

  const handleEdit = (event: DateEvent) => {
    setEditEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Erro ao excluir evento");
    }
  };

  const handleOpenNew = () => {
    setEditEvent(null);
    setDialogOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Quanto tempo faz</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode("cards")}
                title="Cartões"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode("list")}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleOpenNew} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo evento
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="h-9 w-9" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-full bg-secondary p-5">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">Nenhum evento cadastrado</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Adicione datas importantes para saber exatamente quanto tempo se passou desde cada momento especial.
            </p>
            <Button onClick={handleOpenNew} className="mt-6 gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar primeiro evento
            </Button>
          </div>
        ) : (
          viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.id} event={event} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {events.map((event) => (
                <EventListItem key={event.id} event={event} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )
        )}
      </main>

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} editEvent={editEvent} />
    </div>
  );
};

export default Index;
