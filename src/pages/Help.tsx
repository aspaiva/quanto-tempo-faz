import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Sparkles,
  Clock,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SEO } from "@/components/SEO";
import { features, guideSections } from "@/features/help/helpContent";
import {
  buildWhatsAppUrl,
  DEFAULT_SUPPORT_MESSAGE,
} from "@/features/help/whatsapp";

const whatsappHref = buildWhatsAppUrl(DEFAULT_SUPPORT_MESSAGE);

function FeatureCard({
  icon: Icon,
  title,
  summary,
  details,
}: (typeof features)[number]) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group rounded-xl border border-border/70 bg-card/80 p-4 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={open ? "Recolher detalhes" : "Expandir detalhes"}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-relaxed text-foreground/80">
          {details}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <SEO
        title="Ajuda e suporte — Chronosbot"
        description="Aprenda a usar o Chronosbot, descubra funcionalidades e fale com o desenvolvedor pelo WhatsApp."
        path="/help"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(199_84%_35%_/_0.18),transparent_36%),linear-gradient(180deg,hsl(210_33%_97%),hsl(203_38%_92%))]" />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-display text-lg font-bold sm:text-xl">
              Ajuda e suporte
            </h1>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <section className="rounded-2xl border border-border/70 bg-card/85 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Bem-vindo
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
            Chronosbot
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Seu assistente de datas importantes. Acompanhe quanto tempo faz e
            quanto falta para os marcos da sua vida, organize em listas e
            compartilhe com quem importa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 shadow-sm">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Fale com o desenvolvedor
              </a>
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Clock className="h-5 w-5" /> Ir para o app
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">
            Funcionalidades do app
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Toque em um cartão para ver como usar.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Guide */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">
            Orientações de uso
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Um guia rápido para tirar o máximo do Chronosbot.
          </p>
          <div className="mt-5 rounded-2xl border border-border/70 bg-card/85 px-4 shadow-[var(--shadow-card)] backdrop-blur sm:px-6">
            <Accordion type="single" collapsible defaultValue="first-steps">
              {guideSections.map((section) => (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <AccordionTrigger className="font-display text-base font-semibold">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-foreground/85">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Support */}
        <section className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-card/85 to-accent/10 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="relative flex h-2.5 w-2.5"
                    aria-hidden="true"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Atendimento online
                  </span>
                </div>
                <h2 className="mt-2 font-display text-xl font-bold sm:text-2xl">
                  Estamos aqui para ajudar você
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tempo médio de resposta:{" "}
                  <span className="font-medium text-foreground">
                    em até 2 horas
                  </span>{" "}
                  em horário comercial.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="gap-2 border-emerald-500/40 bg-card/80 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300"
              >
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-5 w-5" /> Contato pelo WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Help;