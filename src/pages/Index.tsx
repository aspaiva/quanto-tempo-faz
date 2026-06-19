import { useState, useEffect, useMemo } from "react";
import { Plus, Clock, LogOut, LayoutGrid, List, FolderOpen, ArrowUpDown, Filter, X, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { EventListItem } from "@/components/EventListItem";
import { EventFormDialog } from "@/components/EventFormDialog";
import { DateEvent, loadEvents, saveEvent, deleteEvent, totalDays, setEventFavorite } from "@/lib/events";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { BiometricPostLoginPrompt } from "@/components/BiometricPostLoginPrompt";
import { SEO } from "@/components/SEO";
import { HelpButton } from "@/features/help/HelpButton";

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
    const filtered = selectedCategory
      ? events.filter((e) => e.category === selectedCategory)
      : events;
    const now = Date.now();
    return [...filtered].sort((a, b) => {
      // Favorites always first
      const aFav = a.favorite ? 0 : 1;
      const bFav = b.favorite ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      const aFuture = new Date(a.date).getTime() > now ? 0 : 1;
      const bFuture = new Date(b.date).getTime() > now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      const diff = totalDays(a.date) - totalDays(b.date);
      return sortOrder === "farthest" ? -diff : diff;
    });
  }, [events, sortOrder, selectedCategory]);

  const nextEvent = filteredAndSortedEvents[0];

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

  const handleToggleFavorite = async (event: DateEvent) => {
    const newValue = !event.favorite;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, favorite: newValue } : e)));
    try {
      await setEventFavorite(event.id, newValue);
    } catch (err: any) {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, favorite: !newValue } : e)));
      toast.error(`Erro ao atualizar favorito: ${err?.message ?? "tente novamente"}`);
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
    <div className="min-h-screen bg-background font-body text-foreground">
      <SEO
        title="Quanto tempo? — Acompanhe suas datas importantes"
        description="Veja quanto tempo faz e quanto falta para aniversários, marcos pessoais e compromissos em uma única tela."
        path="/"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(199_84%_35%_/_0.16),transparent_34%),linear-gradient(180deg,hsl(210_33%_97%),hsl(203_38%_92%))]" />
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold text-foreground sm:text-2xl">Quanto tempo faz</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Datas importantes, tempo decorrido e próximos marcos.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <div className="flex rounded-md border border-border bg-card p-0.5 shadow-sm">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("cards")}
                title="Cartões"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => setSortOrder((s) => s === "closest" ? "farthest" : "closest")}
              variant="outline"
              size="sm"
              className="gap-1.5 bg-card shadow-sm"
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
                  className="gap-1.5 bg-card shadow-sm"
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
            <Button onClick={() => navigate("/lists")} variant="outline" size="sm" className="gap-1.5 bg-card shadow-sm">
              <FolderOpen className="h-4 w-4" /> <span className="hidden sm:inline">Listas</span>
            </Button>
            <Button onClick={handleOpenNew} size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo evento</span>
            </Button>
            <Button onClick={() => navigate("/settings/security")} variant="ghost" size="icon" className="h-9 w-9" title="Segurança">
              <ShieldCheck className="h-4 w-4" />
            </Button>
            <HelpButton />
            <Button onClick={handleLogout} variant="ghost" size="icon" className="h-9 w-9" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-card/85 p-4 shadow-[var(--shadow-card)] backdrop-blur">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Eventos</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{events.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/85 p-4 shadow-[var(--shadow-card)] backdrop-blur sm:col-span-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Em foco</p>
                <p className="mt-1 truncate font-display text-xl font-bold">
                  {nextEvent ? nextEvent.label : "Sem eventos para destacar"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {nextEvent
                    ? `${totalDays(nextEvent.date).toLocaleString("pt-BR")} dias ${new Date(nextEvent.date).getTime() > Date.now() ? "até a data" : "desde a data"}`
                    : "Crie um evento para começar o acompanhamento."}
                </p>
              </div>
            </div>
          </div>
        </section>

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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/75 px-6 py-20 text-center">
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/75 px-6 py-20 text-center">
            <p className="text-muted-foreground">Nenhum evento encontrado para "{selectedCategory}"</p>
            <Button variant="outline" onClick={() => setSelectedCategory(null)} className="mt-4 gap-1.5">
              <X className="h-4 w-4" /> Limpar filtro
            </Button>
          </div>
        ) : (
          viewMode === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAndSortedEvents.map((event) => (
                <EventCard key={event.id} event={event} onEdit={handleEdit} onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredAndSortedEvents.map((event) => (
                <EventListItem key={event.id} event={event} onEdit={handleEdit} onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} />
              ))}
            </div>
          )
        )}
      </main>

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleSave} editEvent={editEvent} />
      <BiometricPostLoginPrompt />
    </div>
  );
};

export default Index;
