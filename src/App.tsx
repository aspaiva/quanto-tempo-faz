import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Lists from "./pages/Lists";
import ListDetail from "./pages/ListDetail";
import ResetPassword from "./pages/ResetPassword";
import SecuritySettings from "./pages/SecuritySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppShellMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-body text-foreground">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-pulse rounded-md bg-primary" />
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

function RequireAuth({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const location = useLocation();
  if (!session) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthError(null);
      setLoading(false);
    });
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setAuthError(error.message);
        } else {
          setSession(session);
          setAuthError(null);
        }
      })
      .catch((error) => {
        setAuthError(error instanceof Error ? error.message : "Falha ao iniciar a autenticação.");
      })
      .finally(() => setLoading(false));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <AppShellMessage title="Quanto tempo?" description="Carregando suas datas importantes..." />;
  }

  if (authError) {
    return (
      <AppShellMessage
        title="Não foi possível abrir o app"
        description={`Erro de autenticação: ${authError}`}
        action={<Button onClick={() => window.location.reload()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={session ? <RedirectAfterAuth /> : <Auth />} />
            <Route path="/" element={<RequireAuth session={session}><Index /></RequireAuth>} />
            <Route path="/lists" element={<RequireAuth session={session}><Lists /></RequireAuth>} />
            <Route path="/lists/:id" element={<RequireAuth session={session}><ListDetail /></RequireAuth>} />
            <Route path="/settings/security" element={<RequireAuth session={session}><SecuritySettings /></RequireAuth>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

function RedirectAfterAuth() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect") || "/";
  return <Navigate to={redirect} replace />;
}

export default App;
