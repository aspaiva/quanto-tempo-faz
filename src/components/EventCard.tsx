import { useState } from "react";
import { DateEvent, calculateTimeSince, totalDays, isFutureEvent, daysUntilNextOccurrence } from "@/lib/events";
import { parseLocalDate } from "@/lib/utils";
import { Pencil, Trash2, Calendar, Download, CalendarPlus, Clock, MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { downloadICS } from "@/lib/ics";
import { GoogleCalendarDialog } from "@/components/GoogleCalendarDialog";

interface EventCardProps {
  event: DateEvent;
  onEdit: (event: DateEvent) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (event: DateEvent) => void;
  hideActions?: boolean;
}

export function EventCard({ event, onEdit, onDelete, onToggleFavorite, hideActions }: EventCardProps) {
  const { years, months, days } = calculateTimeSince(event.date);
  const total = totalDays(event.date);
  const formattedDate = parseLocalDate(event.date).toLocaleDateString("pt-BR");
  const [gcalOpen, setGcalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const future = isFutureEvent(event.date);
  const recurring = !!event.recurring;
  const favorite = !!event.favorite;
  const showNextOccurrence = recurring && !future;
  const daysToNext = showNextOccurrence ? daysUntilNextOccurrence(event.date) : 0;

  return (
    <>
      <Card
        className="group relative overflow-hidden border-border/70 bg-card p-0 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
        style={{
          backgroundColor: future ? "hsl(var(--countdown-card))" : undefined,
          borderColor: future ? "hsl(var(--countdown-border))" : undefined,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-secondary-foreground">
                  {event.category}
                </span>
                {future && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-accent">
                    <Clock className="h-3 w-3" />
                    Futuro
                  </span>
                )}
                {recurring && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-primary">
                    Anual
                  </span>
                )}
              </div>
              <h3 className="mt-3 line-clamp-2 font-display text-xl font-extrabold leading-tight text-foreground">{event.label}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
            {!hideActions && (
              <div className="flex items-center gap-0.5">
                {onToggleFavorite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onToggleFavorite(event)}
                    title={favorite ? "Remover dos favoritos" : "Marcar como favorito"}
                    aria-pressed={favorite}
                  >
                    <Star
                      className="h-4 w-4"
                      style={{
                        fill: favorite ? "hsl(var(--primary))" : "transparent",
                        color: favorite ? "hsl(var(--primary))" : undefined,
                      }}
                    />
                  </Button>
                )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(event)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <TimeBlock value={years} label={years === 1 ? "ano" : "anos"} future={future} />
            <TimeBlock value={months} label={months === 1 ? "mês" : "meses"} future={future} />
            <TimeBlock value={days} label={days === 1 ? "dia" : "dias"} future={future} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-muted/35 px-5 py-3">
          <div className="flex flex-col text-sm text-muted-foreground">
            <p>
              {future ? "Faltam" : "Total"} <span className="font-semibold text-foreground">{total.toLocaleString("pt-BR")}</span> dias
            </p>
            {showNextOccurrence && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs" style={{ color: "hsl(var(--countdown-primary))" }}>
                <Clock className="h-3 w-3" />
                {daysToNext === 0
                  ? "É hoje!"
                  : <>Faltam <span className="font-semibold">{daysToNext.toLocaleString("pt-BR")}</span> dias para a próxima</>}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGcalOpen(true)} title="Adicionar ao Google Calendar">
              <CalendarPlus className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Exportar .ics">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadICS(event, "once")}>Ocorrência única</DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadICS(event, "yearly")}>Repetir anualmente</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
      <GoogleCalendarDialog open={gcalOpen} onOpenChange={setGcalOpen} events={[event]} mode="single" />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{event.label}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(event.id);
                setConfirmDelete(false);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TimeBlock({ value, label, future }: { value: number; label: string; future?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex h-16 items-center justify-center rounded-md border bg-secondary/70"
        style={{
          backgroundColor: future ? "hsl(var(--countdown-border) / 0.28)" : undefined,
          borderColor: future ? "hsl(var(--countdown-border) / 0.55)" : undefined,
        }}
      >
        <span
          className="font-display text-3xl font-extrabold tabular-nums leading-none"
          style={{ color: future ? "hsl(var(--countdown-primary))" : "hsl(var(--primary))" }}
        >
          {value}
        </span>
      </div>
      <span className="text-center text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
    </div>
  );
}
