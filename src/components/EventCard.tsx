import { DateEvent, calculateTimeSince, totalDays } from "@/lib/events";
import { Pencil, Trash2, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { downloadICS } from "@/lib/ics";

interface EventCardProps {
  event: DateEvent;
  onEdit: (event: DateEvent) => void;
  onDelete: (id: string) => void;
  hideActions?: boolean;
}

export function EventCard({ event, onEdit, onDelete, hideActions }: EventCardProps) {
  const { years, months, days } = calculateTimeSince(event.date);
  const total = totalDays(event.date);
  const formattedDate = new Date(event.date).toLocaleDateString("pt-BR");

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{event.category}</p>
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
        <TimeBlock value={years} label={years === 1 ? "ano" : "anos"} />
        <TimeBlock value={months} label={months === 1 ? "mês" : "meses"} />
        <TimeBlock value={days} label={days === 1 ? "dia" : "dias"} />
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Total: <span className="font-semibold text-foreground">{total.toLocaleString("pt-BR")}</span> dias
      </p>
    </Card>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 py-2.5 text-center">
      <span className="block font-display text-2xl font-bold text-primary">{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
