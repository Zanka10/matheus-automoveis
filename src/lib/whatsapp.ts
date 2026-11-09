import { onlyDigits } from "./utils";

/** Monta link wa.me com DDI 55 quando necessário */
export function whatsappLink(phone: string | null | undefined, message?: string) {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
