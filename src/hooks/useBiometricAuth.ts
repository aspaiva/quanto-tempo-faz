import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceDetection, biometricLabel } from "./useDeviceDetection";
import { usePasskeys } from "./usePasskeys";

export interface BiometricAuthApi {
  loading: boolean;
  supported: boolean;
  biometricAvailable: boolean;
  currentPlatform: ReturnType<typeof useDeviceDetection>["platform"];
  label: string;
  registerDevice: (deviceName?: string) => Promise<void>;
  signInWithBiometrics: () => Promise<void>;
}

const HINT_KEY = "qt:hasPasskey";

export function setHasPasskeyHint(value: boolean) {
  try {
    if (value) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch { /* noop */ }
}

export function getHasPasskeyHint(): boolean {
  try { return localStorage.getItem(HINT_KEY) === "1"; } catch { return false; }
}

export function useBiometricAuth(): BiometricAuthApi {
  const device = useDeviceDetection();
  const { loading, register, authenticate } = usePasskeys();

  const supported = device.webauthnSupported;
  const biometricAvailable =
    !!device.platformAuthenticatorAvailable && device.webauthnSupported;

  const registerDevice = useCallback(
    async (deviceName?: string) => {
      await register(deviceName);
      setHasPasskeyHint(true);
    },
    [register],
  );

  const signInWithBiometrics = useCallback(async () => {
    const { email, token_hash } = await authenticate();
    const { error } = await supabase.auth.verifyOtp({
      type: "magiclink",
      email,
      token_hash,
    });
    if (error) throw error;
    setHasPasskeyHint(true);
  }, [authenticate]);

  return {
    loading: loading || device.loading,
    supported,
    biometricAvailable,
    currentPlatform: device.platform,
    label: biometricLabel(device.platform),
    registerDevice,
    signInWithBiometrics,
  };
}