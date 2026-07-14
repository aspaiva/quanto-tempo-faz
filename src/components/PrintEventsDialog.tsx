import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DateEvent, calculateTimeSince, isFutureEvent, daysUntilNextOccurrence, totalDays } from "@/lib/events";
import { parseLocalDate } from "@/lib/utils";

type ColumnKey = "category" | "date" | "elapsed" | "nextOccurrence" | "recurring" | "favorite";

interface Column {
  key: ColumnKey;
  label: string;
  default: boolean;
}

const COLUMNS: Column[] = [
  { key: "category", label: "Categoria", default: true },
  { key: "date", label: "Data", default: true },
  { key: "elapsed", label: "Tempo decorrido / restante", default: true },
  { key: "nextOccurrence", label: "Próxima ocorrência (recorrentes)", default: true },
  { key: "recurring", label: "Recorrente", default: false },
  { key: "favorite", label: "Favorito", default: false },
];

const STORAGE_KEY = "print-events-columns-v1";

function loadSelection(): Set<ColumnKey> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as ColumnKey[]);
  } catch {
    /* ignore */
  }
  return new Set(COLUMNS.filter((c) => c.default).map((c) => c.key));
}

function formatElapsed(event: DateEvent): string {
  const t = calculateTimeSince(event.date);
  const parts: string[] = [];
  if (t.years) parts.push(`${t.years} ${t.years === 1 ? "ano" : "anos"}`);
  if (t.months) parts.push(`${t.months} ${t.months === 1 ? "mês" : "meses"}`);
  if (t.days || parts.length === 0) parts.push(`${t.days} ${t.days === 1 ? "dia" : "dias"}`);
  const prefix = isFutureEvent(event.date) ? "Faltam" : "Há";
  return `${prefix} ${parts.join(", ")} (${totalDays(event.date).toLocaleString("pt-BR")} dias)`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function buildHtml(title: string, events: DateEvent[], selected: Set<ColumnKey>): string {
  const cols = COLUMNS.filter((c) => selected.has(c.key));
  const headers = ["Evento", ...cols.map((c) => c.label)];
  const rows = events.map((e) => {
    const cells: string[] = [escapeHtml(e.label)];
    for (const col of cols) {
      let value = "";
      switch (col.key) {
        case "category":
          value = e.category;
          break;
        case "date":
          value = parseLocalDate(e.date).toLocaleDateString("pt-BR");
          break;
        case "elapsed":
          value = formatElapsed(e);
          break;
        case "nextOccurrence": {
          if (e.recurring) {
            const d = daysUntilNextOccurrence(e.date);
            value = d === 0 ? "Hoje" : `Faltam ${d} ${d === 1 ? "dia" : "dias"}`;
          } else {
            value = "—";
          }
          break;
        }
        case "recurring":
          value = e.recurring ? "Sim" : "Não";
          break;
        case "favorite":
          value = e.favorite ? "★" : "";
          break;
      }
      cells.push(escapeHtml(value));
    }
    return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  });
  const now = new Date().toLocaleString("pt-BR");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d0d0d0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  @media print {
    body { margin: 12mm; }
    button { display: none; }
  }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${events.length} ${events.length === 1 ? "evento" : "eventos"} · Gerado em ${escapeHtml(now)}</div>
<table>
  <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.join("")}</tbody>
</table>
<script>window.addEventListener("load", () => setTimeout(() => window.print(), 200));</script>
</body></html>`;
}

interface PrintEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: DateEvent[];
  title: string;
}

export function PrintEventsDialog({ open, onOpenChange, events, title }: PrintEventsDialogProps) {
  const [selected, setSelected] = useState<Set<ColumnKey>>(() => loadSelection());

  useEffect(() => {
    if (open) setSelected(loadSelection());
  }, [open]);

  const toggle = (key: ColumnKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePrint = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    const html = buildHtml(title, events, selected);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-body sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Imprimir eventos</DialogTitle>
          <DialogDescription>
            Serão impressos {events.length} {events.length === 1 ? "evento" : "eventos"} na ordem atual, respeitando o filtro aplicado. Escolha os campos a incluir — sua preferência será lembrada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 opacity-70">
            <Checkbox checked disabled id="col-label" />
            <Label htmlFor="col-label">Nome do evento (sempre incluído)</Label>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center gap-2">
              <Checkbox
                id={`col-${col.key}`}
                checked={selected.has(col.key)}
                onCheckedChange={() => toggle(col.key)}
              />
              <Label htmlFor={`col-${col.key}`} className="cursor-pointer">{col.label}</Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handlePrint} disabled={events.length === 0} className="gap-1.5">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}