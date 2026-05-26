export const SUPPORT_PHONE = "5527997132058";

export function buildWhatsAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${SUPPORT_PHONE}?text=${encoded}`;
}

export const DEFAULT_SUPPORT_MESSAGE =
  "Sobre o app Chronosbot\n[Helpdesk]\n\nOlá! Preciso de ajuda com o Chronosbot.";