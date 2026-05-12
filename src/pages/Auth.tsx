import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CalendarDays, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BiometricLoginButton } from "@/components/BiometricLoginButton";
import { useBiometricAuth, getHasPasskeyHint } from "@/hooks/useBiometricAuth";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { biometricAvailable } = useBiometricAuth();
  const showBiometric = mode === "login" && biometricAvailable && getHasPasskeyHint();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("E-mail de recuperação enviado. Verifique sua caixa de entrada.");
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu e-mail para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_18%,hsl(199_84%_35%_/_0.18),transparent_30%),radial-gradient(circle_at_84%_74%,hsl(156_50%_42%_/_0.14),transparent_28%),linear-gradient(180deg,hsl(210_33%_97%),hsl(203_38%_92%))]" />
      <main className="relative grid min-h-screen items-center gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-12">
        <section className="mx-auto hidden max-w-2xl lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-accent" />
            Datas, memórias e contagens em um só lugar
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-tight text-foreground">
            Acompanhe o tempo que passou e o que ainda está por vir.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Organize aniversários, marcos pessoais e compromissos em uma interface simples, clara e pronta para consulta rápida.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {["Eventos", "Listas", "Calendário"].map((item) => (
              <div key={item} className="rounded-lg border border-border/70 bg-card/75 p-4 shadow-[var(--shadow-card)] backdrop-blur">
                <Clock className="mb-3 h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md border-border/70 bg-card/90 p-6 shadow-[var(--shadow-card-hover)] backdrop-blur">
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarDays className="h-7 w-7" strokeWidth={1.7} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-foreground">Quanto tempo?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login" ? "Entre na sua conta" : mode === "signup" ? "Crie sua conta" : "Recupere sua senha"}
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar e-mail de recuperação"}
            </Button>
          </form>
          {showBiometric && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>
              <BiometricLoginButton />
            </>
          )}
          {mode === "login" && (
            <button onClick={() => setMode("forgot")} className="mt-3 block w-full text-center text-sm text-muted-foreground hover:text-primary hover:underline">
              Esqueci minha senha
            </button>
          )}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="font-semibold text-primary hover:underline">
              {mode === "signup" ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
