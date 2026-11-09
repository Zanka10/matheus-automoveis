"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CarFront, ImageIcon, MessageSquareQuote, Type } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";

export type PubTab = "veiculos" | "banners" | "textos" | "depoimentos";

const META: Record<PubTab, { label: string; icon: typeof CarFront }> = {
  veiculos: { label: "Veículos no site", icon: CarFront },
  banners: { label: "Banners", icon: ImageIcon },
  textos: { label: "Textos e chamadas", icon: Type },
  depoimentos: { label: "Depoimentos", icon: MessageSquareQuote },
};

export function PublicationsTabs({
  tabs,
  active,
  panels,
}: {
  tabs: PubTab[];
  active: PubTab;
  panels: Partial<Record<PubTab, React.ReactNode>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <Tabs
      value={active}
      onValueChange={(v) => {
        const next = new URLSearchParams(sp.toString());
        next.set("aba", v);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <TabsList>
          {tabs.map((t) => {
            const Icon = META[t].icon;
            return (
              <TabsTrigger key={t} value={t}>
                <Icon className="size-4" /> {META[t].label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t} value={t} className="mt-6">
          {panels[t]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
