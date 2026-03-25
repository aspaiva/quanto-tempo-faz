import { useState, useEffect } from "react";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { EventFormDialog } from "@/components/EventFormDialog";
import { DateEvent, loadEvents, saveEvents } from "@/lib/events";

const Index = () => {
  const [events, setEvents] = useState<DateEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<DateEvent | null>(null);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const handleSave = (data: Omit<DateEvent, "id"> & { id?: string }) => {
    let updated: DateEvent[];
    if (data.id) {
      updated = events.map((e) => (e.id === data.id ? { ...e, ...data, id: e.id } : e));
    } else {
      updated = [...events, { ...data, id: crypto.randomUUID() }];
    }
    setEvents(updated);
    saveEvents(updated);
    setEditEvent(null);
  };

  const handleEdit = (event: DateEvent) => {
    setEditEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    saveEvents(updated);
  };

  const handleOpenNew = () => {
    setEditEvent(null);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Quanto tempo faz</h1>
          </div>
          <Button onClick={handleOpenNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {events.length === 0 ? (
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
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} editEvent={editEvent} />
    </div>
  );
};

export default Index;
