"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CarFront,
  ExternalLink,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Settings,
  Tags,
  Users,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Avatar } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth";
import { NAV_SECTIONS } from "./nav";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CarFront,
  Warehouse,
  MessagesSquare,
  Tags,
  Megaphone,
  BarChart3,
  Users,
  History,
  Settings,
};

type ShellUser = { name: string; email: string; roleLabel: string; permissions: string[] };

export function AdminShell({
  user,
  badges,
  children,
}: {
  user: ShellUser;
  badges: { newQuotes: number };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.anyOf.some((p) => user.permissions.includes(p))),
  })).filter((s) => s.items.length);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo tone="light" href="/admin" />
        <button className="rounded-md p-1.5 text-sidebar-muted hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Menu do painel">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted/80">{section.title}</p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = isActive(item.href);
                const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                      )}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
                      <Icon className={cn("size-[18px]", active ? "text-brand" : "text-sidebar-muted group-hover:text-white")} />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{badge > 99 ? "99+" : badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
        >
          <ExternalLink className="size-[18px] text-sidebar-muted" />
          Ver loja pública
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[oklch(0.975_0.002_75)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-sidebar lg:block">{sidebar}</aside>

      {/* Sidebar mobile */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
        <div className={cn("absolute inset-0 bg-black/50 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside className={cn("absolute inset-y-0 left-0 w-72 bg-sidebar shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "-translate-x-full")}>
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur-md sm:px-6">
          <button className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
              </div>
              <Avatar name={user.name} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuLabel>
                <span className="block text-sm font-semibold text-foreground">{user.name}</span>
                <span className="block truncate font-normal">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/alterar-senha">
                  <KeyRound /> Alterar senha
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={() => logoutAction()}>
                <LogOut /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
