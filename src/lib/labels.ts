// Rótulos em português para os enums do banco — fonte única para loja e painel.
import type {
  FuelType,
  MovementType,
  QuoteSource,
  QuoteStatus,
  Role,
  Transmission,
  VehicleCondition,
  VehicleStatus,
} from "@prisma/client";

export const fuelLabels: Record<FuelType, string> = {
  FLEX: "Flex",
  GASOLINE: "Gasolina",
  ETHANOL: "Etanol",
  DIESEL: "Diesel",
  HYBRID: "Híbrido",
  ELECTRIC: "Elétrico",
  GNV: "GNV",
};

export const transmissionLabels: Record<Transmission, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automático",
  CVT: "CVT",
  AUTOMATED: "Automatizado",
  DCT: "Dupla embreagem",
};

export const conditionLabels: Record<VehicleCondition, string> = {
  NEW: "Novo",
  USED: "Seminovo",
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  NEW: "Novo",
  IN_PROGRESS: "Em atendimento",
  AWAITING_RETURN: "Aguardando retorno",
  PROPOSAL_SENT: "Proposta enviada",
  NEGOTIATION: "Negociação",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado",
};

export const quoteStatusOrder: QuoteStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "AWAITING_RETURN",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "FINISHED",
  "CANCELED",
];

export const quoteSourceLabels: Record<QuoteSource, string> = {
  FORM: "Formulário",
  INTEREST: "Tenho interesse",
  WHATSAPP: "WhatsApp",
};

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SELLER: "Vendedor",
};

export const movementLabels: Record<MovementType, string> = {
  CREATED: "Cadastrado",
  UPDATED: "Atualizado",
  STATUS_CHANGED: "Status alterado",
  PUBLISHED: "Publicado no site",
  UNPUBLISHED: "Retirado do site",
  FEATURED: "Marcado como destaque",
  UNFEATURED: "Removido dos destaques",
  PRICE_CHANGED: "Preço alterado",
  DUPLICATED: "Duplicado",
  SOLD: "Vendido",
};

/** Classes de cor (Tailwind) por status — usadas em badges */
export const vehicleStatusTone: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  RESERVED: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400",
  SOLD: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400",
};

export const quoteStatusTone: Record<QuoteStatus, string> = {
  NEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  AWAITING_RETURN: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PROPOSAL_SENT: "bg-violet-50 text-violet-700 ring-violet-600/20",
  NEGOTIATION: "bg-orange-50 text-orange-700 ring-orange-600/20",
  FINISHED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELED: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};
