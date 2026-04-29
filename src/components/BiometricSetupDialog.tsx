import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, ScanFace, ShieldCheck, Loader2 } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  defaultDeviceName?: string;
}

export function BiometricSetupDialog({ open, onOpenChange, onDone, defaultDeviceName }: Props) {
  const { biometricAvailable, currentPlatform, registerDevice, label } = useBiometricAuth();
  const [deviceName, setDeviceName] = useState(defaultDeviceName ?? guessDeviceName(currentPlatform));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const Icon = currentPlatform === "ios" ? ScanFace : Fingerprint;

  const handle = async () => {
    setBusy(true);
    try {
      await registerDevice(deviceName.trim() || "Meu dispositivo");
      setDone(true);
      toast.success("Confirmação realizada com segurança");
      setTimeout(() => {
        onOpenChange(false);
        onDone?.();
      }, 900);
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (!/cancel|aborted|NotAllowed/i.test(msg)) {
        toast.error(msg || "Não conseguimos registrar este dispositivo");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(210_85%_55%/0.12)] text-[hsl(210_85%_45%)] transition-transform duration-200 data-[state=done]:scale-110"
               data-state={done ? "done" : "idle"}>
            {done ? <ShieldCheck className="h-7 w-7 text-emerald-600" /> : <Icon className="h-7 w-7" strokeWidth={1.6} />}
          </div>
          <DialogTitle className="text-center font-display">
            {done ? "Tudo pronto!" : `Entre mais rápido com ${label}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {done
              ? "Da próxima vez, basta um toque para entrar."
              : "Use seu rosto ou impressão digital para acessar sua conta sem digitar senha."}
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <div className="space-y-2">
            <Label htmlFor="device-name">Nome deste dispositivo</Label>
            <Input
              id="device-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              maxLength={60}
              disabled={busy}
            />
          </div>
        )}

        {!done && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Agora não
            </Button>
            <Button onClick={handle} disabled={busy || !biometricAvailable}>
              {busy ? <Loader2 className="animate-spin" /> : <Icon strokeWidth={1.7} />}
              {busy ? "Confirmando..." : "Ativar"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function guessDeviceName(platform: string): string {
  if (platform === "ios") return "Meu iPhone";
  if (platform === "android") return "Meu Android";
  if (platform === "macos") return "Meu Mac";
  if (platform === "windows") return "Meu PC";
  return "Meu dispositivo";
}