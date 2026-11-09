import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Invalida o cache da loja pública após qualquer alteração no painel,
 * garantindo que as mudanças apareçam imediatamente para os clientes.
 */
export function revalidateStore(vehicleSlug?: string | null) {
  revalidatePath("/", "layout");
  revalidatePath("/veiculos");
  if (vehicleSlug) revalidatePath(`/veiculos/${vehicleSlug}`);
}
