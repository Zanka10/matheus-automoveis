"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Lock, ScanEye, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, FormSection, applyServerErrors, fieldError } from "@/components/ui/form";
import { Switch } from "@/components/ui/primitives";
import { conditionLabels, fuelLabels, transmissionLabels, vehicleStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { createVehicleAction, updateVehicleAction } from "@/server/actions/vehicles";
import {
  CONDITION_VALUES,
  FUEL_VALUES,
  TRANSMISSION_VALUES,
  VEHICLE_STATUS_VALUES,
  vehicleSchema,
} from "@/validations/vehicle";
import { ChipsInput } from "./chips-input";

type FormIn = z.input<typeof vehicleSchema>;
type FormOut = z.output<typeof vehicleSchema>;

export type VehicleFormOptionsDTO = {
  brands: { id: string; name: string; models: { id: string; name: string; categoryId: string | null }[] }[];
  categories: { id: string; name: string }[];
};

const FEATURE_SUGGESTIONS = [
  "Ar-condicionado digital",
  "Direção elétrica",
  "Central multimídia",
  "Android Auto e Apple CarPlay",
  "Câmera de ré",
  "Sensor de estacionamento",
  "Piloto automático",
  "Controle de cruzeiro adaptativo",
  "Bancos em couro",
  "Teto solar",
  "Faróis em LED",
  "Rodas de liga leve",
  "Chave presencial",
  "Partida por botão",
  "Painel digital",
  "Carregador por indução",
  "Airbags laterais e de cortina",
  "Controle de estabilidade",
  "Alerta de ponto cego",
  "Frenagem autônoma",
  "Vidros elétricos",
  "Travas elétricas",
];

const HIGHLIGHT_SUGGESTIONS = ["Único dono", "Revisões em concessionária", "Laudo cautelar aprovado", "Manual e chave reserva", "IPVA pago", "Garantia de fábrica", "Baixa quilometragem"];

const NAV = [
  { id: "principal", label: "Principal" },
  { id: "comercial", label: "Comercial" },
  { id: "tecnico", label: "Ficha técnica" },
  { id: "opcionais", label: "Itens e opcionais" },
  { id: "descricao", label: "Descrição" },
  { id: "publicacao", label: "Publicação" },
  { id: "fotos", label: "Fotos" },
];

function formatMoneyInput(v: unknown) {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PrivateTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Lock className="size-2.5" /> Privado
    </span>
  );
}

function ToggleRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      {children}
    </label>
  );
}

export function VehicleForm({
  mode,
  vehicleId,
  defaultValues,
  options,
  canPublish,
  canStock,
  imageCount = 0,
  imagesSlot,
}: {
  mode: "create" | "edit";
  vehicleId?: string;
  defaultValues: FormIn;
  options: VehicleFormOptionsDTO;
  canPublish: boolean;
  canStock: boolean;
  imageCount?: number;
  imagesSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      ...defaultValues,
      price: formatMoneyInput(defaultValues.price),
      promoPrice: formatMoneyInput(defaultValues.promoPrice),
    },
    mode: "onTouched",
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const brandId = useWatch({ control, name: "brandId" });
  const isOffer = useWatch({ control, name: "isOffer" });
  const status = useWatch({ control, name: "status" });
  const models = useMemo(() => options.brands.find((b) => b.id === brandId)?.models ?? [], [options.brands, brandId]);
  const err = (name: string) => fieldError(errors, name);

  const onSubmit = handleSubmit(
    async (values) => {
      const res = mode === "create" ? await createVehicleAction(values) : await updateVehicleAction(vehicleId!, values);
      if (!res.ok) {
        applyServerErrors(setError, res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Salvo.");
      if (mode === "create") {
        const id = (res.data as { id: string } | undefined)?.id;
        router.push(id ? `/admin/veiculos/${id}/editar#fotos` : "/admin/veiculos");
      } else {
        form.reset(form.getValues());
        router.refresh();
      }
    },
    () => toast.error("Revise os campos destacados."),
  );

  const navItems = NAV.filter((n) => (n.id === "publicacao" ? canPublish : true));

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[180px_1fr]">
      <nav className="hidden lg:block" aria-label="Seções do formulário">
        <ul className="sticky top-24 flex flex-col gap-0.5 text-sm">
          {navItems.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} className="block rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-5 pb-24">
        <FormSection title="Informações principais" description="Identificação do veículo." className="scroll-mt-24">
          <div id="principal" className="scroll-mt-40 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Marca" htmlFor="brandId" required error={err("brandId")}>
              <NativeSelect
                id="brandId"
                {...register("brandId", {
                  onChange: () => {
                    setValue("modelId", "", { shouldDirty: true });
                    setValue("categoryId", null, { shouldDirty: true });
                  },
                })}
              >
                <option value="">Selecione</option>
                {options.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Modelo"
              htmlFor="modelId"
              required
              error={err("modelId")}
              hint={brandId && models.length === 0 ? "Nenhum modelo cadastrado para esta marca." : undefined}
            >
              <NativeSelect
                id="modelId"
                disabled={!brandId}
                {...register("modelId", {
                  onChange: (e) => {
                    const m = models.find((x) => x.id === e.target.value);
                    if (m?.categoryId) setValue("categoryId", m.categoryId, { shouldDirty: true });
                  },
                })}
              >
                <option value="">{brandId ? "Selecione" : "Escolha a marca"}</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Categoria" htmlFor="categoryId" error={err("categoryId")} hint="Preenchida a partir do modelo.">
              <NativeSelect id="categoryId" {...register("categoryId", { setValueAs: (v) => v || null })}>
                <option value="">Sem categoria</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Versão" htmlFor="version" required error={err("version")} className="sm:col-span-2 lg:col-span-3">
              <Input id="version" placeholder="Ex.: Limited 1.3 T270 Turbo Flex Aut." {...register("version")} />
            </Field>
            <Field label="Ano de fabricação" htmlFor="manufactureYear" required error={err("manufactureYear")}>
              <Input id="manufactureYear" inputMode="numeric" maxLength={4} {...register("manufactureYear")} />
            </Field>
            <Field label="Ano do modelo" htmlFor="modelYear" required error={err("modelYear")}>
              <Input id="modelYear" inputMode="numeric" maxLength={4} {...register("modelYear")} />
            </Field>
            <Field label="Condição" htmlFor="condition" required error={err("condition")}>
              <NativeSelect id="condition" {...register("condition")}>
                {CONDITION_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {conditionLabels[c]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Quilometragem" htmlFor="mileage" required error={err("mileage")}>
              <div className="relative">
                <Input id="mileage" inputMode="numeric" className="pr-10" {...register("mileage")} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">km</span>
              </div>
            </Field>
            <Field
              label={
                <>
                  Placa <PrivateTag />
                </>
              }
              htmlFor="plate"
              error={err("plate")}
              hint="Nunca exibida na loja."
            >
              <Input id="plate" placeholder="ABC1D23" className="uppercase" maxLength={8} {...register("plate")} />
            </Field>
            <Field label="Código interno" htmlFor="internalCode" error={err("internalCode")} hint={mode === "create" ? "Deixe vazio para gerar automaticamente." : undefined}>
              <Input id="internalCode" placeholder="MA-0000" className="font-mono uppercase" {...register("internalCode")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Informações comerciais" className="scroll-mt-24">
          <div id="comercial" className="scroll-mt-40 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Preço de venda (R$)" htmlFor="price" required error={err("price")}>
              <Input
                id="price"
                inputMode="decimal"
                placeholder="0,00"
                {...register("price", { onBlur: (e) => setValue("price", formatMoneyInput(e.target.value)) })}
              />
            </Field>
            <Field label="Preço promocional (R$)" htmlFor="promoPrice" error={err("promoPrice")} hint="Opcional. Exibido com o preço original riscado.">
              <Input
                id="promoPrice"
                inputMode="decimal"
                placeholder="0,00"
                {...register("promoPrice", { onBlur: (e) => setValue("promoPrice", formatMoneyInput(e.target.value)) })}
              />
            </Field>
            <Field label="Status do estoque" htmlFor="status" error={err("status")} hint={!canStock ? "Sem permissão para alterar o status." : status === "SOLD" ? "Use “Alterar status” para registrar dados da venda." : undefined}>
              <NativeSelect id="status" disabled={!canStock} {...register("status")}>
                {VEHICLE_STATUS_VALUES.filter((s) => mode === "edit" || s !== "SOLD").map((s) => (
                  <option key={s} value={s}>
                    {vehicleStatusLabels[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
              <ToggleRow label="Aceita troca" description="Avalia o usado do cliente na negociação.">
                <Controller control={control} name="acceptsTrade" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              </ToggleRow>
              <ToggleRow label="Disponível para financiamento" description="Exibe a opção de financiamento na loja.">
                <Controller control={control} name="financingAvailable" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              </ToggleRow>
            </div>
          </div>
        </FormSection>

        <FormSection title="Características técnicas" className="scroll-mt-24">
          <div id="tecnico" className="scroll-mt-40 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Motor" htmlFor="engine" error={err("engine")}>
              <Input id="engine" placeholder="Ex.: 1.3 Turbo" {...register("engine")} />
            </Field>
            <Field label="Potência" htmlFor="power" error={err("power")}>
              <Input id="power" placeholder="Ex.: 185 cv" {...register("power")} />
            </Field>
            <Field label="Combustível" htmlFor="fuel" required error={err("fuel")}>
              <NativeSelect id="fuel" {...register("fuel")}>
                {FUEL_VALUES.map((f) => (
                  <option key={f} value={f}>
                    {fuelLabels[f]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Câmbio" htmlFor="transmission" required error={err("transmission")}>
              <NativeSelect id="transmission" {...register("transmission")}>
                {TRANSMISSION_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {transmissionLabels[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Direção" htmlFor="steering" error={err("steering")}>
              <Input id="steering" placeholder="Ex.: Elétrica" list="steering-options" {...register("steering")} />
              <datalist id="steering-options">
                <option value="Elétrica" />
                <option value="Hidráulica" />
                <option value="Eletro-hidráulica" />
                <option value="Mecânica" />
              </datalist>
            </Field>
            <Field label="Tração" htmlFor="drivetrain" error={err("drivetrain")}>
              <Input id="drivetrain" placeholder="Ex.: Dianteira" list="drivetrain-options" {...register("drivetrain")} />
              <datalist id="drivetrain-options">
                <option value="Dianteira" />
                <option value="Traseira" />
                <option value="Integral" />
                <option value="4x4" />
              </datalist>
            </Field>
            <Field label="Portas" htmlFor="doors" error={err("doors")}>
              <Input id="doors" inputMode="numeric" maxLength={1} {...register("doors")} />
            </Field>
            <Field label="Passageiros" htmlFor="seats" error={err("seats")}>
              <Input id="seats" inputMode="numeric" maxLength={2} {...register("seats")} />
            </Field>
            <Field label="Cor" htmlFor="color" error={err("color")}>
              <Input id="color" placeholder="Ex.: Cinza Granite" {...register("color")} />
            </Field>
            <Field label="Consumo" htmlFor="consumption" error={err("consumption")} className="sm:col-span-2 lg:col-span-3">
              <Input id="consumption" placeholder="Ex.: 10,8 km/l (cidade) / 13,1 km/l (estrada)" {...register("consumption")} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Itens e opcionais" description="Clique nas sugestões ou adicione itens personalizados." className="scroll-mt-24">
          <div id="opcionais" className="scroll-mt-40">
            <Controller
              control={control}
              name="features"
              render={({ field }) => (
                <ChipsInput
                  id="features"
                  value={Array.isArray(field.value) ? field.value : []}
                  onChange={(v) => field.onChange(v)}
                  suggestions={FEATURE_SUGGESTIONS}
                  placeholder="Ex.: Som premium JBL"
                />
              )}
            />
            {err("features") && <p className="mt-2 text-xs font-medium text-destructive">{err("features")}</p>}
          </div>
        </FormSection>

        <FormSection title="Descrição" className="scroll-mt-24">
          <div id="descricao" className="scroll-mt-40 grid gap-4">
            <Field label="Descrição comercial" htmlFor="description" error={err("description")} hint="Texto exibido na página do veículo.">
              <Textarea id="description" rows={5} {...register("description")} />
            </Field>
            <Field label="Diferenciais do automóvel" error={err("highlights")}>
              <Controller
                control={control}
                name="highlights"
                render={({ field }) => (
                  <ChipsInput
                    value={Array.isArray(field.value) ? field.value : []}
                    onChange={(v) => field.onChange(v)}
                    suggestions={HIGHLIGHT_SUGGESTIONS}
                    placeholder="Ex.: Pneus novos"
                    max={20}
                  />
                )}
              />
            </Field>
            <Field label="Informações sobre conservação" htmlFor="conservation" error={err("conservation")}>
              <Textarea id="conservation" rows={3} placeholder="Estado da pintura, interior, pneus, revisões…" {...register("conservation")} />
            </Field>
            <Field
              label={
                <>
                  Observações internas <PrivateTag />
                </>
              }
              htmlFor="internalNotes"
              error={err("internalNotes")}
              hint="Visível apenas no painel."
            >
              <Textarea id="internalNotes" rows={3} className="bg-amber-50/40" {...register("internalNotes")} />
            </Field>
          </div>
        </FormSection>

        {canPublish && (
          <FormSection title="Publicação na loja" description="Controle como o veículo aparece no site." className="scroll-mt-24">
            <div id="publicacao" className="scroll-mt-40 grid gap-3 sm:grid-cols-2">
              <ToggleRow
                label="Publicado no site"
                description={
                  mode === "create"
                    ? "Publique após enviar as fotos."
                    : imageCount === 0
                      ? "Envie ao menos uma foto para publicar."
                      : status === "SOLD"
                        ? "Veículos vendidos não são exibidos."
                        : "Visível no catálogo público."
                }
              >
                <Controller
                  control={control}
                  name="published"
                  render={({ field }) => (
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={mode === "create" || imageCount === 0 || status === "SOLD"} />
                  )}
                />
              </ToggleRow>
              <ToggleRow label="Destaque na página inicial" description="Aparece na seção de destaques.">
                <Controller control={control} name="featured" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              </ToggleRow>
              <ToggleRow label="Oportunidade / oferta especial" description="Exibido na seção de ofertas.">
                <Controller control={control} name="isOffer" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              </ToggleRow>
              <Field label="Selo da oferta" htmlFor="offerLabel" error={err("offerLabel")} className={cn(!isOffer && "opacity-50")}>
                <Input id="offerLabel" placeholder="Ex.: Taxa zero" maxLength={40} disabled={!isOffer} {...register("offerLabel")} />
              </Field>
            </div>
          </FormSection>
        )}

        <FormSection title="Fotos" description="Upload múltiplo, imagem principal e ordem de exibição." className="scroll-mt-24">
          <div id="fotos" className="scroll-mt-40">
            {imagesSlot ?? (
              <p className="rounded-lg bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Salve o cadastro para enviar as fotos. Você será direcionado automaticamente para esta etapa.
              </p>
            )}
          </div>
        </FormSection>
      </div>

      {/* Barra de ações fixa */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur-md lg:left-64">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {isDirty ? "Há alterações não salvas." : mode === "create" ? "Preencha os dados e salve para continuar." : "Tudo salvo."}
          </p>
          <div className="flex flex-1 justify-end gap-2">
            {mode === "edit" && vehicleId && (
              <Button asChild variant="outline">
                <Link href={`/admin/veiculos/${vehicleId}/previa`} target="_blank">
                  <ScanEye /> <span className="hidden sm:inline">Pré-visualizar</span>
                </Link>
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" loading={isSubmitting}>
              <Save /> {mode === "create" ? "Cadastrar e enviar fotos" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
