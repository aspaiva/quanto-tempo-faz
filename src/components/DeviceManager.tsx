import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, ScanFace, Trash2, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { BiometricSetupDialog } from "./BiometricSetupDialog";
import { useBiometricAuth, setHasPasskeyHint } from "@/hooks/useBiometricAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Credential {
  id: string;
  device_name: string;
  device_type: string | null;
  last_used_at: string | null;
  created_at: string;
}

export function DeviceManager() {
  const [items, setItems] = useState<Credential[] | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const { biometricAvailable, label } = useBiometricAuth();

  const load = async () => {
    const { data, error } = await supabase
      .from("webauthn_credentials")
      .select("id, device_name, device_type, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(data ?? []);
    setHasPasskeyHint((data?.length ?? 0) > 0);
  };

  useEffect(() => { void load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("webauthn_credentials").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dispositivo removido");
    void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[hsl(210_85%_45%)]" />
            Acesso por biometria
          </CardTitle>
          <CardDescription>Gerencie os dispositivos que entram sem senha.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setSetupOpen(true)} disabled={!biometricAvailable}>
          <Plus /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum dispositivo cadastrado ainda.
            {biometricAvailable
              ? ` Toque em "Adicionar" para usar ${label} aqui.`
              : " Este dispositivo não suporta biometria."}
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((c) => {
              const Icon = (c.device_type ?? "").includes("multiDevice") ? ScanFace : Fingerprint;
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(210_85%_55%/0.12)] text-[hsl(210_85%_45%)]">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{c.device_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.last_used_at
                        ? `Usado em ${new Date(c.last_used_at).toLocaleDateString("pt-BR")}`
                        : `Adicionado em ${new Date(c.created_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Remover">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover este dispositivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você precisará entrar com senha e configurar a biometria novamente neste aparelho.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(c.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <BiometricSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onDone={load} />
    </Card>
  );
}