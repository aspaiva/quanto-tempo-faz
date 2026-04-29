import { useCallback, useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

export interface PasskeysApi {
  loading: boolean;
  register: (deviceName?: string) => Promise<void>;
  authenticate: () => Promise<{ email: string; token_hash: string }>;
}

export function usePasskeys(): PasskeysApi {
  const [loading, setLoading] = useState(false);

  const register = useCallback(async (deviceName?: string) => {
    setLoading(true);
    try {
      const { data: optsRes, error: optsErr } = await supabase.functions.invoke(
        "webauthn-register",
        { body: { action: "options" } },
      );
      if (optsErr) throw new Error(optsErr.message);
      if (optsRes?.error) throw new Error(optsRes.error);

      const attResp = await startRegistration({ optionsJSON: optsRes.options });

      const { data: verRes, error: verErr } = await supabase.functions.invoke(
        "webauthn-register",
        { body: { action: "verify", response: attResp, deviceName } },
      );
      if (verErr) throw new Error(verErr.message);
      if (verRes?.error) throw new Error(verRes.error);
    } finally {
      setLoading(false);
    }
  }, []);

  const authenticate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: optsRes, error: optsErr } = await supabase.functions.invoke(
        "webauthn-authenticate",
        { body: { action: "options" } },
      );
      if (optsErr) throw new Error(optsErr.message);
      if (optsRes?.error) throw new Error(optsRes.error);

      const assResp = await startAuthentication({ optionsJSON: optsRes.options });

      const { data: verRes, error: verErr } = await supabase.functions.invoke(
        "webauthn-authenticate",
        { body: { action: "verify", response: assResp } },
      );
      if (verErr) throw new Error(verErr.message);
      if (verRes?.error) throw new Error(verRes.error);

      return { email: verRes.email as string, token_hash: verRes.token_hash as string };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, register, authenticate };
}