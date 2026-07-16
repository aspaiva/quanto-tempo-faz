import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES, saveEvent, type DateEvent } from "@/lib/events";
import { addEventToList } from "@/lib/lists";
import { toast } from "sonner";

type Row = Record<string, unknown>;

interface ParsedEvent {
  label: string;
  category: string;
  date: string; // ISO YYYY-MM-DD
  recurring: boolean;
  valid: boolean;
  selected: boolean;
  error?: string;
}

const FLAT_CATEGORIES = EVENT_CATEGORIES.flatMap((g) => g.items);

const LABEL_KEYS = ["label", "nome", "evento", "titulo", "título", "descricao", "descrição", "name", "title", "event"];
const DATE_KEYS = ["data", "date", "dia", "nascimento", "aniversario", "aniversário", "birthday", "dob"];
const CATEGORY_KEYS = ["categoria", "category", "tipo", "grupo", "type"];

function normalizeKey(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectColumn(headers: string[], candidates: string[]): string | null {
  const norm = headers.map((h) => ({ raw: h, key: normalizeKey(h) }));
  for (const c of candidates) {
    const found = norm.find((h) => h.key === c || h.key.includes(c));
    if (found) return found.raw;
  }
  return null;
}

const MONTH_PT: Record<string, number> = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, março: 3, abr: 4, abril: 4,
  mai: 5, maio: 5, jun: 6, junho: 6, jul: 7, julho: 7, ago: 8, agosto: 8,
  set: 9, setembro: 9, out: 10, outubro: 10, nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

function pad(n: number) { return String(n).padStart(2, "0"); }

type DateFormat = "DD/MM" | "MM/DD";

const DEFAULT_YEAR = 2000;

function parseDate(raw: unknown, format: DateFormat): { iso: string | null; hasYear: boolean } {
  if (raw == null || raw === "") return { iso: null, hasYear: false };

  // Excel serial date number
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return { iso: `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`, hasYear: true };
    }
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return { iso: `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}-${pad(raw.getDate())}`, hasYear: true };
  }

  const s = String(raw).trim();
  if (!s) return { iso: null, hasYear: false };

  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return { iso: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`, hasYear: true };

  const pick = (a: number, b: number): [number, number] =>
    format === "DD/MM" ? [a, b] : [b, a]; // returns [day, month]

  const validate = (day: number, month: number, year: number): string | null => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  };

  // X/Y/YYYY — só aceita ano com 4 dígitos como "ano informado".
  // Anos de 2 dígitos são ambíguos, então tratamos como sem ano (default 2000, recorrente).
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const year = +m[3];
    const [day, month] = pick(+m[1], +m[2]);
    const iso = validate(day, month, year);
    if (iso) return { iso, hasYear: true };
    return { iso: null, hasYear: false };
  }

  // X/Y/YY (ano de 2 dígitos) → ignora o ano, usa 2000 como padrão
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.]\d{1,2}$/);
  if (m) {
    const [day, month] = pick(+m[1], +m[2]);
    const iso = validate(day, month, DEFAULT_YEAR);
    if (iso) return { iso, hasYear: false };
    return { iso: null, hasYear: false };
  }

  // X/Y (no year) → default year 2000
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})$/);
  if (m) {
    const [day, month] = pick(+m[1], +m[2]);
    const iso = validate(day, month, DEFAULT_YEAR);
    if (iso) return { iso, hasYear: false };
    return { iso: null, hasYear: false };
  }

  // "15 de março [de 2000]" or "15 março 2000"
  m = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-zç]+)(?:\s+(?:de\s+)?(\d{4}))?$/i);
  if (m) {
    const mn = MONTH_PT[normalizeKey(m[2])];
    if (mn) {
      if (m[3]) return { iso: `${m[3]}-${pad(mn)}-${pad(+m[1])}`, hasYear: true };
      return { iso: `${DEFAULT_YEAR}-${pad(mn)}-${pad(+m[1])}`, hasYear: false };
    }
  }

  return { iso: null, hasYear: false };
}

interface ImportEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId?: string;
  onImported?: (events: DateEvent[]) => void;
}

export function ImportEventsDialog({ open, onOpenChange, listId, onImported }: ImportEventsDialogProps) {
  const [step, setStep] = useState<"upload" | "map" | "review">("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [labelCol, setLabelCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [categoryCol, setCategoryCol] = useState<string>("__none__");
  const [parsed, setParsed] = useState<ParsedEvent[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<string>("Outro");
  const [importing, setImporting] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormat>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("import.dateFormat") : null;
    return saved === "MM/DD" ? "MM/DD" : "DD/MM";
  });

  const reset = () => {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setLabelCol("");
    setDateCol("");
    setCategoryCol("__none__");
    setParsed([]);
    setImporting(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (file: File) => {
    try {
      const isCSV = /\.csv$/i.test(file.name) || file.type === "text/csv";
      let wb: XLSX.WorkBook;
      if (isCSV) {
        const buf = new Uint8Array(await file.arrayBuffer());
        // Detecta BOM UTF-8; caso contrário, tenta UTF-8 estrito e faz fallback para windows-1252
        const hasBOM = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
        let text: string;
        if (hasBOM) {
          text = new TextDecoder("utf-8").decode(buf.subarray(3));
        } else {
          try {
            text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
          } catch {
            text = new TextDecoder("windows-1252").decode(buf);
          }
        }
        wb = XLSX.read(text, { type: "string", raw: true });
      } else {
        const buf = await file.arrayBuffer();
        wb = XLSX.read(buf, { type: "array", cellDates: true });
      }
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: true });
      if (!json.length) {
        toast.error("Arquivo vazio ou sem linhas de dados");
        return;
      }
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setRows(json);
      setLabelCol(detectColumn(hdrs, LABEL_KEYS) || hdrs[0] || "");
      setDateCol(detectColumn(hdrs, DATE_KEYS) || hdrs[1] || "");
      const catCol = detectColumn(hdrs, CATEGORY_KEYS);
      setCategoryCol(catCol || "__none__");
      setStep("map");
    } catch (e) {
      toast.error("Não foi possível ler o arquivo");
      console.error(e);
    }
  };

  const handleParseAndReview = () => {
    if (!labelCol || !dateCol) {
      toast.error("Selecione as colunas de nome e data");
      return;
    }
    try { localStorage.setItem("import.dateFormat", dateFormat); } catch { /* ignore */ }
    const results: ParsedEvent[] = rows.map((r) => {
      const label = String(r[labelCol] ?? "").trim();
      const rawDate = r[dateCol];
      const rawCat = categoryCol !== "__none__" ? String(r[categoryCol] ?? "").trim() : "";
      const { iso, hasYear } = parseDate(rawDate, dateFormat);
      if (!label) return { label: "", category: rawCat || defaultCategory, date: "", recurring: false, valid: false, selected: false, error: "Sem nome" };
      if (!iso) return { label, category: rawCat || defaultCategory, date: "", recurring: false, valid: false, selected: false, error: "Data inválida" };
      return {
        label,
        category: rawCat || defaultCategory,
        date: iso,
        recurring: !hasYear,
        valid: true,
        selected: true,
      };
    });
    setParsed(results);
    setStep("review");
  };

  const validCount = useMemo(() => parsed.filter((p) => p.valid).length, [parsed]);
  const selectedCount = useMemo(() => parsed.filter((p) => p.valid && p.selected).length, [parsed]);

  const updateRow = (idx: number, patch: Partial<ParsedEvent>) => {
    setParsed((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const applyCategoryToAll = (cat: string) => {
    setParsed((prev) => prev.map((p) => ({ ...p, category: cat })));
  };

  const toggleAllSelected = (checked: boolean) => {
    setParsed((prev) => prev.map((p) => (p.valid ? { ...p, selected: checked } : p)));
  };

  const handleImport = async () => {
    setImporting(true);
    const saved: DateEvent[] = [];
    let failed = 0;
    for (const p of parsed) {
      if (!p.valid || !p.selected) continue;
      try {
        const ev = await saveEvent({
          label: p.label,
          category: p.category,
          date: p.date,
          recurring: p.recurring,
          favorite: false,
        });
        if (listId) {
          try { await addEventToList(listId, ev.id); } catch { /* ignore */ }
        }
        saved.push(ev);
      } catch {
        failed++;
      }
    }
    setImporting(false);
    if (saved.length) toast.success(`${saved.length} evento(s) importado(s)`);
    if (failed) toast.error(`${failed} evento(s) falharam ao importar`);
    onImported?.(saved);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="font-body sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar eventos
          </DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV ou Excel (.xlsx) com nomes e datas para importar em lote.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="rounded-full bg-secondary p-5">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Aceita <strong>.csv</strong>, <strong>.xlsx</strong> e <strong>.xls</strong>. O arquivo deve ter uma linha de cabeçalho.
              Datas sem ano (ex.: 15/03) serão marcadas como recorrentes automaticamente.
            </p>
            <label className="cursor-pointer">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Upload className="h-4 w-4" /> Escolher arquivo
              </span>
            </label>
          </div>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-4 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              {rows.length} linha(s) detectada(s). Confira o mapeamento das colunas:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome do evento *</Label>
                <Select value={labelCol} onValueChange={setLabelCol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Select value={dateCol} onValueChange={setDateCol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria (opcional)</Label>
                <Select value={categoryCol} onValueChange={setCategoryCol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria padrão</Label>
                <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {FLAT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Formato das datas *</Label>
                <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM">DD/MM (dia primeiro) — ex.: 06/08 = 6 de agosto</SelectItem>
                    <SelectItem value="MM/DD">MM/DD (mês primeiro) — ex.: 06/08 = 8 de junho</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Datas sem ano usarão <strong>2000</strong> como padrão e serão marcadas como recorrentes.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={handleParseAndReview} className="gap-1.5">
                Revisar <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-accent">
                  <CheckCircle2 className="h-4 w-4" /> {selectedCount}/{validCount} selecionado(s)
                </span>
                {parsed.length - validCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" /> {parsed.length - validCount} com erro
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Aplicar categoria a todos:</Label>
                <Select onValueChange={applyCategoryToAll}>
                  <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Escolher..." /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {FLAT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-y-auto rounded-md border border-border/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">
                      <Checkbox
                        checked={validCount > 0 && selectedCount === validCount}
                        onCheckedChange={(v) => toggleAllSelected(!!v)}
                        aria-label="Selecionar todos"
                      />
                    </th>
                    <th className="px-2 py-2 text-left font-medium">Nome</th>
                    <th className="px-2 py-2 text-left font-medium">Data</th>
                    <th className="px-2 py-2 text-left font-medium">Categoria</th>
                    <th className="px-2 py-2 text-left font-medium">Anual</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((p, idx) => (
                    <tr key={idx} className={`border-t border-border/50 ${!p.valid ? "bg-destructive/5" : ""} ${p.valid && !p.selected ? "opacity-50" : ""}`}>
                      <td className="px-2 py-1.5">
                        <Checkbox
                          checked={p.selected}
                          disabled={!p.valid}
                          onCheckedChange={(v) => updateRow(idx, { selected: !!v })}
                          aria-label="Importar este item"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={p.label}
                          onChange={(e) => {
                            const nowValid = !!e.target.value.trim() && !!p.date;
                            updateRow(idx, { label: e.target.value, valid: nowValid, selected: nowValid ? p.selected : false });
                          }}
                          className="h-8"
                        />
                        {p.error && <span className="text-xs text-destructive">{p.error}</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="date"
                          value={p.date}
                          onChange={(e) => {
                            const nowValid = !!p.label.trim() && !!e.target.value;
                            updateRow(idx, { date: e.target.value, valid: nowValid, selected: nowValid ? p.selected : false });
                          }}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select value={p.category} onValueChange={(v) => updateRow(idx, { category: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-64">
                            {!FLAT_CATEGORIES.includes(p.category) && (
                              <SelectItem value={p.category}>{p.category}</SelectItem>
                            )}
                            {FLAT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Checkbox
                          checked={p.recurring}
                          onCheckedChange={(v) => updateRow(idx, { recurring: !!v })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("map")} disabled={importing}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing || selectedCount === 0} className="gap-1.5">
                {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : `Importar ${selectedCount} evento(s)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}