import { useState } from "react";
import { DateEvent, calculateTimeSince, totalDays } from "@/lib/events";
import { Pencil, Trash2, Download, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const formattedDate = new Date(event.date).toLocaleDateString("pt-BR");
  const [gcalOpen, setGcalOpen] = useState(false);

  return (
    <>
      <div className="group flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3 transition-shadow hover:shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-sm font-semibold text-foreground">{event.label}</span>
            <span className="shrink-0 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {event.category}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{formattedDate}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="font-display font-bold text-primary">{years}<span className="ml-0.5 text-xs font-normal text-muted-foreground">a</span></span>
          <span className="font-display font-bold text-primary">{months}<span className="ml-0.5 text-xs font-normal text-muted-foreground">m</span></span>
          <span className="font-display font-bold text-primary">{days}<span className="ml-0.5 text-xs font-normal text-muted-foreground">d</span></span>
          <span className="text-xs text-muted-foreground">({total.toLocaleString("pt-BR")}d)</span>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGcalOpen(true)} title="Adicionar ao Google Calendar">
            <CalendarPlus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadICS(event)} title="Exportar .ics">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        {!hideActions && (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(event)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(event.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <GoogleCalendarDialog open={gcalOpen} onOpenChange={setGcalOpen} events={[event]} mode="single" />
    </>
  );
}
