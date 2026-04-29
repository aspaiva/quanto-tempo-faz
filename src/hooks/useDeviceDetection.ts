import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "macos" | "windows" | "linux" | "unknown";

export interface DeviceInfo {
  platform: Platform;
  isMobile: boolean;
  isStandalone: boolean; // installed PWA
  webauthnSupported: boolean;
  platformAuthenticatorAvailable: boolean | null;
  conditionalUiAvailable: boolean;
  loading: boolean;
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/linux/.test(ua)) return "linux";
  return "unknown";
}

export function useDeviceDetection(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>({
    platform: "unknown",
    isMobile: false,
    isStandalone: false,
    webauthnSupported: false,
    platformAuthenticatorAvailable: null,
    conditionalUiAvailable: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const platform = detectPlatform();
      const isMobile = platform === "ios" || platform === "android";
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS legacy
        window.navigator.standalone === true;

      const webauthnSupported =
        typeof window !== "undefined" &&
        !!window.PublicKeyCredential &&
        typeof navigator.credentials?.create === "function";

      let platformAuthenticatorAvailable: boolean | null = null;
      let conditionalUiAvailable = false;

      if (webauthnSupported) {
        try {
          platformAuthenticatorAvailable =
            await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch {
          platformAuthenticatorAvailable = false;
        }
        try {
          const PKC = window.PublicKeyCredential as unknown as {
            isConditionalMediationAvailable?: () => Promise<boolean>;
          };
          conditionalUiAvailable = !!(await PKC.isConditionalMediationAvailable?.());
        } catch { /* noop */ }
      }

      if (cancelled) return;
      setInfo({
        platform,
        isMobile,
        isStandalone,
        webauthnSupported,
        platformAuthenticatorAvailable,
        conditionalUiAvailable,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return info;
}

export function biometricLabel(platform: Platform): string {
  switch (platform) {
    case "ios": return "Face ID / Touch ID";
    case "android": return "biometria";
    case "macos": return "Touch ID";
    case "windows": return "Windows Hello";
    default: return "biometria";
  }
}