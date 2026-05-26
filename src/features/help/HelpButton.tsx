import { HelpCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HelpButtonProps {
  variant?: "ghost" | "outline";
  className?: string;
}

export function HelpButton({ variant = "ghost", className }: HelpButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === "/help") return null;
  return (
    <Button
      onClick={() => navigate("/help")}
      variant={variant}
      size="icon"
      className={className ?? "h-9 w-9"}
      title="Ajuda e suporte"
      aria-label="Ajuda e suporte"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
}