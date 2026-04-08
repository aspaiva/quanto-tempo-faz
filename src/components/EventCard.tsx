import { useState } from "react";
import { DateEvent, calculateTimeSince, totalDays, isFutureEvent } from "@/lib/events";
import { parseLocalDate } from "@/lib/utils";
import { Pencil, Trash2, Calendar, Download, CalendarPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadICS } from "@/lib/ics";
import { GoogleCalendarDialog } from "@/components/GoogleCalendarDialog";

interface EventCardProps {
  event: DateEvent;
  onEdit: (event: DateEvent) => void;
  onDelete: (id: string) => void;
  hideActions?: boolean;
}

export function EventCard({ event, onEdit, onDelete, hideActions }: EventCardProps) {
  const { years, months, days } = calculateTimeSince(event.date);
  const total = totalDays(event.date);
  const formattedDate = parseLocalDate(event.date).toLocaleDateString("pt-BR");
  const [gcalOpen, setGcalOpen] = useState(false);
  const future = isFutureEvent(event.date);

  return (
    <>
      <Card
        className="group relative overflow-hidden border-border/60 p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
        style={{
          boxShadow: "var(--shadow-card)",
          backgroundColor: future ? "hsl(var(--countdown-card))" : undefined,
          borderColor: future ? "hsl(var(--countdown-border))" : undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {future && <Clock className="mr-1 inline h-3 w-3" />}
              {event.category}
            </p>
            <h3 className="mt-1 truncate font-display text-lg font-semibold text-foreground">{event.label}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>
          {!hideActions && (
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(event.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <TimeBlock value={years} label={years === 1 ? "ano" : "anos"} future={future} />
          <TimeBlock value={months} label={months === 1 ? "mês" : "meses"} future={future} />
          <TimeBlock value={days} label={days === 1 ? "dia" : "dias"} future={future} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {future ? "Faltam" : "Total"}: <span className="font-semibold text-foreground">{total.toLocaleString("pt-BR")}</span> dias
          </p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGcalOpen(true)} title="Adicionar ao Google Calendar">
              <CalendarPlus className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Exportar .ics">
                  <Download className="h-3.5 w-3.5" />
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
    </>
  );
}

function TimeBlock({ value, label, future }: { value: number; label: string; future?: boolean }) {
  return (
    <div className="rounded-lg py-2.5 text-center" style={future ? { backgroundColor: "hsl(var(--countdown-border) / 0.3)" } : undefined}>
      <span
        className="block font-display text-2xl font-bold"
        style={{ color: future ? "hsl(var(--countdown-primary))" : undefined }}
      >
        {value}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
