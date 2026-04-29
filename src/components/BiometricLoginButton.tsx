import { Fingerprint, ScanFace, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function BiometricLoginButton({ onSuccess, variant = "outline", className }: Props) {
  const { biometricAvailable, currentPlatform, signInWithBiometrics, label } = useBiometricAuth();
  const [busy, setBusy] = useState(false);

  if (!biometricAvailable) return null;

  const Icon = currentPlatform === "ios" ? ScanFace : Fingerprint;

  const handle = async () => {
    setBusy(true);
    try {
      await signInWithBiometrics();
      toast.success("Seu dispositivo reconheceu você");
      onSuccess?.();
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (!/cancel|aborted|NotAllowed/i.test(msg)) {
        toast.error(msg || "Não conseguimos confirmar sua biometria");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handle}
      disabled={busy}
      className={
        "group relative w-full overflow-hidden transition-all duration-200 active:scale-[0.98] " +
        "hover:shadow-[0_0_24px_-6px_hsl(210_85%_55%/0.55)] " +
        (className ?? "")
      }
    >
      <span className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-[hsl(210_90%_60%/0.12)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {busy ? <Loader2 className="animate-spin" /> : <Icon strokeWidth={1.7} />}
      <span>{busy ? "Reconhecendo..." : `Entrar com ${label}`}</span>
    </Button>
  );
}