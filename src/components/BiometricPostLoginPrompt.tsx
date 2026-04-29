import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBiometricAuth, getHasPasskeyHint } from "@/hooks/useBiometricAuth";
import { BiometricSetupDialog } from "./BiometricSetupDialog";

const DISMISS_KEY = "qt:bioPromptDismissedAt";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 86400_000;
  } catch { return false; }
}

export function BiometricPostLoginPrompt() {
  const { biometricAvailable, loading } = useBiometricAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !biometricAvailable) return;
    if (getHasPasskeyHint() || recentlyDismissed()) return;

    let cancelled = false;
    (async () => {
      // Check the server: does this user already have credentials?
      const { data, error } = await supabase
        .from("webauthn_credentials")
        .select("id")
        .limit(1);
      if (cancelled) return;
      if (!error && (data?.length ?? 0) > 0) return;
      // Delay slightly so it doesn't compete with first paint
      setTimeout(() => !cancelled && setOpen(true), 800);
    })();

    return () => { cancelled = true; };
  }, [biometricAvailable, loading]);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    }
  };

  return <BiometricSetupDialog open={open} onOpenChange={handleOpenChange} />;
}