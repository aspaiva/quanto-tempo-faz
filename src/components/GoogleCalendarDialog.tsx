import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarPlus, Unlink } from "lucide-react";
import { DateEvent } from "@/lib/events";
import {
  checkGCalConnection,
  disconnectGCal,
  getGCalAuthUrl,
  listCalendars,
  createGCalEvent,
  createGCalEventsBatch,
  GoogleCalendar,
} from "@/lib/google-calendar";
import { toast } from "sonner";

interface GoogleCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: DateEvent[];
  mode: "single" | "batch";
}

export function GoogleCalendarDialog({ open, onOpenChange, events, mode }: GoogleCalendarDialogProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const [recurrence, setRecurrence] = useState<"once" | "yearly">("once");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    checkGCalConnection()
      .then(async (isConnected) => {
        setConnected(isConnected);
        if (isConnected) {
          try {
            const cals = await listCalendars();
            setCalendars(cals);
            const primary = cals.find((c) => c.primary);
            if (primary) setSelectedCalendar(primary.id);
            else if (cals.length > 0) setSelectedCalendar(cals[0].id);
          } catch (err) {
            if ((err as Error).message === "NOT_CONNECTED") {
              setConnected(false);
            } else {
              toast.error("Erro ao listar agendas");
            }
          }
        }
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, [open]);

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "gcal-connected") {
        setConnected(true);
        setLoading(true);
        listCalendars()
          .then((cals) => {
            setCalendars(cals);
            const primary = cals.find((c) => c.primary);
            if (primary) setSelectedCalendar(primary.id);
            else if (cals.length > 0) setSelectedCalendar(cals[0].id);
          })
          .catch(() => toast.error("Erro ao listar agendas"))
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Check URL param for redirect-based flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "connected") {
      // Remove param from URL
      params.delete("gcal");
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const url = await getGCalAuthUrl(window.location.href);
      // Open in popup
      const popup = window.open(url, "gcal-auth", "width=500,height=600");
      if (!popup) {
        // Fallback to redirect
        window.location.href = url;
      }
    } catch {
      toast.error("Erro ao conectar com Google Calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGCal();
      setConnected(false);
      setCalendars([]);
      toast.success("Google Calendar desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  const handleSubmit = async () => {
    if (!selectedCalendar) {
      toast.error("Selecione uma agenda");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "single" && events.length === 1) {
        await createGCalEvent(selectedCalendar, events[0], recurrence);
        toast.success("Evento adicionado ao Google Calendar!");
      } else {
        const results = await createGCalEventsBatch(selectedCalendar, events, recurrence);
        const success = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        if (failed === 0) {
          toast.success(`${success} evento(s) adicionado(s) ao Google Calendar!`);
        } else {
          toast.warning(`${success} adicionado(s), ${failed} com erro`);
        }
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Erro ao criar evento(s)");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-body sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Google Calendar
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !connected ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta do Google para adicionar eventos diretamente ao seu calendário.
            </p>
            <Button onClick={handleConnect} className="gap-2">
              <CalendarPlus className="h-4 w-4" /> Conectar Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Agenda de destino</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma agenda" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary && "(principal)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de registro</Label>
              <RadioGroup value={recurrence} onValueChange={(v) => setRecurrence(v as "once" | "yearly")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="once" id="once" />
                  <Label htmlFor="once" className="text-sm">Ocorrência única (evento fixo)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="text-sm">Repetir anualmente (aniversários, casamentos, etc.)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {mode === "single" ? "Evento:" : `${events.length} evento(s):`}
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {events.map((e) => (
                  <p key={e.id} className="text-sm text-foreground truncate">
                    {e.label} — {new Date(e.date).toLocaleDateString("pt-BR")}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleDisconnect}>
                <Unlink className="h-3.5 w-3.5" /> Desconectar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !selectedCalendar} className="gap-1.5">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                {submitting ? "Adicionando..." : "Adicionar ao calendário"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
