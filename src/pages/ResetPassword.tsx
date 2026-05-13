import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (session) setReady(true);
      }
    });

    // Check if already has a session (token was already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Also check hash/query for type=recovery
    if (
      window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery")
    ) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      navigate("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 font-body">
      <SEO title="Redefinir senha — Quanto tempo?" description="Crie uma nova senha para sua conta no Quanto tempo?." path="/reset-password" noindex />
      <Card className="w-full max-w-sm border-border/60 p-6">
        <div className="mb-6 flex flex-col items-center gap-2">
          <CalendarDays className="h-10 w-10 text-primary" strokeWidth={1.5} />
          <h1 className="font-display text-2xl font-bold text-foreground">Nova senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>
        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : "Atualizar senha"}
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Verificando link de recuperação...</p>
        )}
      </Card>
    </main>
  );
};

export default ResetPassword;
