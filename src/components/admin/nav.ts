import type { Permission } from "@/server/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Exibido se o usuário tiver QUALQUER uma destas permissões */
  anyOf: Permission[];
  badgeKey?: "newQuotes";
};

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Visão geral",
    items: [{ href: "/admin", label: "Dashboard", icon: "LayoutDashboard", anyOf: ["dashboard.view"] }],
  },
  {
    title: "Operação",
    items: [
      { href: "/admin/veiculos", label: "Veículos", icon: "CarFront", anyOf: ["vehicles.view"] },
      { href: "/admin/estoque", label: "Estoque", icon: "Warehouse", anyOf: ["vehicles.view"] },
      { href: "/admin/orcamentos", label: "Orçamentos", icon: "MessagesSquare", anyOf: ["quotes.view", "quotes.viewAll"], badgeKey: "newQuotes" },
      { href: "/admin/marcas", label: "Marcas e modelos", icon: "Tags", anyOf: ["brands.manage"] },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/publicacoes", label: "Publicações", icon: "Megaphone", anyOf: ["content.manage", "vehicles.publish"] },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/admin/relatorios", label: "Relatórios", icon: "BarChart3", anyOf: ["reports.view"] },
      { href: "/admin/funcionarios", label: "Funcionários", icon: "Users", anyOf: ["users.manage"] },
      { href: "/admin/atividades", label: "Atividades", icon: "History", anyOf: ["activity.view"] },
      { href: "/admin/configuracoes", label: "Configurações", icon: "Settings", anyOf: ["settings.manage"] },
    ],
  },
];
