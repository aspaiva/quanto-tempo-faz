import { useState, useEffect } from "react";
import { DateEvent, EVENT_CATEGORIES } from "@/lib/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Omit<DateEvent, "id"> & { id?: string }) => void;
  editEvent?: DateEvent | null;
}

export function EventFormDialog({ open, onOpenChange, onSave, editEvent }: Props) {
  const [step, setStep] = useState<"category" | "form">(editEvent ? "form" : "category");
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState<Date | undefined>();

  useEffect(() => {
    if (editEvent) {
      setStep("form");
      setCategory(editEvent.category);
      setLabel(editEvent.label);
      setDate(new Date(editEvent.date));
    } else {
      setStep("category");
      setCategory("");
      setLabel("");
      setDate(undefined);
    }
  }, [editEvent, open]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setLabel("");
    setStep("form");
  };

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleSubmit} disabled={!label.trim() || !date} className="w-full">
              {editEvent ? "Salvar alterações" : "Adicionar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
