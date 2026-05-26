import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DeviceManager } from "@/components/DeviceManager";
import { SEO } from "@/components/SEO";
import { HelpButton } from "@/features/help/HelpButton";

const SecuritySettings = () => {
  return (
    <main className="min-h-screen bg-background font-body">
      <SEO
        title="Segurança e dispositivos — Quanto tempo?"
        description="Gerencie dispositivos com biometria, Face ID e Touch ID associados à sua conta no Quanto tempo?."
        path="/settings/security"
        noindex
      />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Voltar">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-bold">Segurança</h1>
          <div className="ml-auto">
            <HelpButton />
          </div>
        </div>
        <DeviceManager />
      </div>
    </main>
  );
};

export default SecuritySettings;