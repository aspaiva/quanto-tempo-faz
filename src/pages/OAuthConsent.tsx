import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { SEO } from "@/components/SEO";

type AuthorizationDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

// Local typed wrapper — auth.oauth is a beta namespace on @supabase/supabase-js.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function oauthApi(): OAuthApi | null {
  const anyAuth = supabase.auth as unknown as { oauth?: OAuthApi };
  return anyAuth.oauth ?? null;
}

function isSafeRelativePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Solicitação de autorização inválida (authorization_id ausente).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/auth?redirect=${encodeURIComponent(next)}`;
        return;
      }
      const api = oauthApi();
      if (!api) {
        setError("Servidor OAuth indisponível nesta instalação.");
        return;
      }
      const { data, error } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = oauthApi();
    if (!api) return;
    setBusy(true);
    const { data, error } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um redirecionamento.");
      return;
    }
    if (isSafeRelativePath(target)) {
      window.location.assign(target);
    } else {
      window.location.href = target;
    }
  }

  const clientName = details?.client?.name ?? "um app externo";

  return (
    <main className="min-h-screen bg-background font-body text-foreground">
      <SEO
        title="Autorizar acesso — Quanto tempo?"
        description="Autorize um app externo a acessar sua conta Quanto tempo? via OAuth."
        path="/.lovable/oauth/consent"
        noindex
      />
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <Card className="w-full border-border/70 bg-card/90 p-6 shadow-[var(--shadow-card-hover)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="h-6 w-6" strokeWidth={1.7} />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold">Autorizar acesso</h1>
              <p className="text-sm text-muted-foreground">Quanto tempo?</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!details && !error && (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          )}

          {details && (
            <div className="space-y-4">
              <p className="text-base">
                Conectar <strong>{clientName}</strong> à sua conta do Quanto tempo?
              </p>
              <p className="text-sm text-muted-foreground">
                {clientName} poderá usar as ferramentas deste app agindo como você enquanto estiver conectado. Isto não substitui as permissões e políticas de acesso já existentes.
              </p>
              {details.client?.redirect_uri && (
                <p className="text-xs text-muted-foreground break-all">
                  Redirecionamento: {details.client.redirect_uri}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                  Autorizar
                </Button>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
};

export default OAuthConsent;