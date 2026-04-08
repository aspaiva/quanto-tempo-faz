import { useState, useEffect } from "react";
import { DateEvent, EVENT_CATEGORIES } from "@/lib/events";
import { parseLocalDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Omit<DateEvent, "id"> & { id?: string }) => void;
  editEvent?: DateEvent | null;
}

function parseDateInput(value: string): Date | undefined {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getFullYear() === Number(yyyy) && d.getMonth() === Number(mm) - 1 && d.getDate() === Number(dd) && d <= new Date()) {
    return d;
  }
  return undefined;
}

export function EventFormDialog({ open, onOpenChange, onSave, editEvent }: Props) {
  const [step, setStep] = useState<"category" | "form">(editEvent ? "form" : "category");
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [dateText, setDateText] = useState("");

  useEffect(() => {
    if (editEvent) {
      setStep("form");
      setCategory(editEvent.category);
      setLabel(editEvent.label);
      const d = parseLocalDate(editEvent.date);
      setDate(d);
      setDateText(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
    } else {
      setStep("category");
      setCategory("");
      setLabel("");
      setDate(undefined);
      setDateText("");
    }
  }, [editEvent, open]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setLabel("");
    setStep("form");
  };

  const handleDateTextChange = (value: string) => {
    // Auto-format: insert slashes
    const digits = value.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    setDateText(formatted);
    const parsed = parseDateInput(formatted);
    setDate(parsed);
  };

  // Quick selectors for month/year to pick via dropdowns
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const openPicker = () => {
    const ref = date || new Date();
    setPickerMonth(ref.getMonth());
    setPickerYear(ref.getFullYear());
    setShowPicker(true);
  };

  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(pickerYear, pickerMonth, 1).getDay();
  const today = new Date();

  const selectDay = (day: number) => {
    const d = new Date(pickerYear, pickerMonth, day);
    if (d > today) return;
    setDate(d);
    setDateText(`${String(day).padStart(2, "0")}/${String(pickerMonth + 1).padStart(2, "0")}/${pickerYear}`);
    setShowPicker(false);
  };

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i);

  const handleSubmit = () => {
    if (!label.trim() || !date) return;
    onSave({
      id: editEvent?.id,
      category,
      label: label.trim(),
      date: date.toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-body sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editEvent ? "Editar evento" : step === "category" ? "Escolha o tipo de evento" : "Detalhes do evento"}
          </DialogTitle>
        </DialogHeader>

        {step === "category" ? (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
              {EVENT_CATEGORIES.map((group) => (
                <div key={group.group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => handleCategorySelect(item)}
                        className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-4">
            {!editEvent && (
              <button onClick={() => setStep("category")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            <p className="text-sm text-muted-foreground">Categoria: <span className="font-medium text-foreground">{category}</span></p>
            <div className="space-y-2">
              <Label htmlFor="label">Identificação (pessoa ou evento)</Label>
              <Input id="label" placeholder="Ex: Maria, Formatura, Casamento..." value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label>Data do evento</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="DD/MM/AAAA"
                  value={dateText}
                  onChange={(e) => handleDateTextChange(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={openPicker} title="Abrir calendário">
                  📅
                </Button>
              </div>
              {dateText.length === 10 && !date && (
                <p className="text-xs text-destructive">Data inválida ou no futuro</p>
              )}
            </div>

            {/* Mini calendar picker */}
            {showPicker && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                <div className="flex gap-2">
                  <Select value={String(pickerMonth)} onValueChange={(v) => setPickerMonth(Number(v))}>
                    <SelectTrigger className="flex-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m, i) => (
                        <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(pickerYear)} onValueChange={(v) => setPickerYear(Number(v))}>
                    <SelectTrigger className="w-24 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                    <span key={i} className="py-1 font-semibold text-muted-foreground">{d}</span>
                  ))}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <span key={`e${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const d = new Date(pickerYear, pickerMonth, day);
                    const isFuture = d > today;
                    const isSelected = date && date.getDate() === day && date.getMonth() === pickerMonth && date.getFullYear() === pickerYear;
                    return (
                      <button
                        key={day}
                        disabled={isFuture}
                        onClick={() => selectDay(day)}
                        className={`rounded py-1 text-sm transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground font-bold" :
                          isFuture ? "text-muted-foreground/40 cursor-not-allowed" :
                          "hover:bg-secondary text-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowPicker(false)}>Fechar</Button>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={!label.trim() || !date} className="w-full">
              {editEvent ? "Salvar alterações" : "Adicionar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
