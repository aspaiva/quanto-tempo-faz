import { useState, useEffect, useMemo } from "react";
import { Plus, Clock, LogOut, LayoutGrid, List, FolderOpen, ArrowUpDown, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { EventListItem } from "@/components/EventListItem";
import { EventFormDialog } from "@/components/EventFormDialog";
import { DateEvent, loadEvents, saveEvent, deleteEvent, totalDays } from "@/lib/events";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BiometricPostLoginPrompt } from "@/components/BiometricPostLoginPrompt";

type ViewMode = "cards" | "list";
type SortOrder = "closest" | "farthest";

const Index = () => {
  const [events, setEvents] = useState<DateEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<DateEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [sortOrder, setSortOrder] = useState<SortOrder>("closest");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const existingCategories = useMemo(() => {
    const cats = [...new Set(events.map((e) => e.category))];
    return cats.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [events]);

  const filteredAndSortedEvents = useMemo(() => {
    let filtered = selectedCategory
      ? events.filter((e) => e.category === selectedCategory)
      : events;
    const now = Date.now();
    const sorted = [...filtered].sort((a, b) => {
      const aFuture = new Date(a.date).getTime() > now ? 0 : 1;
      const bFuture = new Date(b.date).getTime() > now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      const diff = totalDays(a.date) - totalDays(b.date);
      return sortOrder === "farthest" ? -diff : diff;
    });
    return sorted;
  }, [events, sortOrder, selectedCategory]);

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
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">Quanto tempo faz</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedCategory ? "secondary" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  title="Filtrar por categoria"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">{selectedCategory ? selectedCategory : "Filtrar"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                {selectedCategory && (
                  <>
                    <DropdownMenuItem onClick={() => setSelectedCategory(null)} className="gap-2 text-muted-foreground">
                      <X className="h-3.5 w-3.5" /> Limpar filtro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {existingCategories.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cat === selectedCategory ? "bg-accent font-medium" : ""}
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate("/lists")} variant="outline" size="sm" className="gap-1.5">
              <FolderOpen className="h-4 w-4" /> <span className="hidden sm:inline">Listas</span>
            </Button>
            <Button onClick={handleOpenNew} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo evento</span>
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="h-9 w-9" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {selectedCategory && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrando por:</span>
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedCategory(null)}>
              {selectedCategory} <X className="h-3 w-3" />
            </Badge>
          </div>
        )}
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
        ) : filteredAndSortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">Nenhum evento encontrado para "{selectedCategory}"</p>
            <Button variant="outline" onClick={() => setSelectedCategory(null)} className="mt-4 gap-1.5">
              <X className="h-4 w-4" /> Limpar filtro
            </Button>
          </div>
        ) : (
          viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredAndSortedEvents.map((event) => (
                <EventCard key={event.id} event={event} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredAndSortedEvents.map((event) => (
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
