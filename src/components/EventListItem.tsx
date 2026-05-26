import { useState } from "react";
import { DateEvent, calculateTimeSince, totalDays, isFutureEvent } from "@/lib/events";
import { parseLocalDate } from "@/lib/utils";
import { Pencil, Trash2, Download, CalendarPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { downloadICS } from "@/lib/ics";
import { GoogleCalendarDialog } from "@/components/GoogleCalendarDialog";

interface EventListItemProps {
  event: DateEvent;
  onEdit: (event: DateEvent) => void;
  onDelete: (id: string) => void;
  hideActions?: boolean;
}

export function EventListItem({ event, onEdit, onDelete, hideActions }: EventListItemProps) {
  const { years, months, days } = calculateTimeSince(event.date);
  const total = totalDays(event.date);
  const formattedDate = parseLocalDate(event.date).toLocaleDateString("pt-BR");
  const [gcalOpen, setGcalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const future = isFutureEvent(event.date);

  return (
    <>
      <div
        className="group grid gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
        style={{
          backgroundColor: future ? "hsl(var(--countdown-card))" : undefined,
          borderColor: future ? "hsl(var(--countdown-border))" : undefined,
        }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-display text-base font-bold text-foreground">{event.label}</span>
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-secondary-foreground">
              {event.category}
            </span>
            {future && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-semibold uppercase leading-none text-accent">
                <Clock className="h-3 w-3" />
                Futuro
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-sm sm:w-[260px]">
          <CompactTime value={years} label="a" />
          <CompactTime value={months} label="m" />
          <CompactTime value={days} label="d" />
          <CompactTime value={total} label="total" />
        </div>

        <div className="flex items-center justify-end gap-1">
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

          {!hideActions && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)} title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)} title="Excluir">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
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

function CompactTime({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md bg-secondary/70 px-2 py-1.5">
      <span className="block font-display text-base font-extrabold leading-none text-primary tabular-nums">{value.toLocaleString("pt-BR")}</span>
      <span className="mt-0.5 block text-[10px] font-semibold uppercase leading-none text-muted-foreground">{label}</span>
    </div>
  );
}
