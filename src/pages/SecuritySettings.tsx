import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DeviceManager } from "@/components/DeviceManager";

const SecuritySettings = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Voltar">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-bold">Segurança</h1>
        </div>
        <DeviceManager />
      </div>
    </div>
  );
};

export default SecuritySettings;