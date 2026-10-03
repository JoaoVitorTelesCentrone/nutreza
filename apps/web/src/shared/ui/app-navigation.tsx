"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  CircleHelp,
  House,
  Menu,
  MessageCircle,
  Settings2,
  Sparkles,
  UserRoundCog,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const groups: Array<{ label: string; items: NavigationItem[]; align?: "right" }> = [
  {
    label: "Consultório",
    items: [
      { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/app/pacientes", label: "Pacientes", icon: Users },
      { href: "/app/questionarios", label: "Questionários", icon: ClipboardList },
      { href: "/app/mensagens", label: "Mensagens", icon: MessageCircle },
    ],
  },
  {
    label: "Nutrição",
    items: [
      { href: "/app/alimentos", label: "Alimentos", icon: Apple },
      { href: "/app/teca", label: "Teca IA", icon: Sparkles },
      { href: "/app/biblioteca", label: "Biblioteca", icon: BookOpen },
    ],
  },
  {
    label: "Gestão",
    align: "right",
    items: [
      { href: "/app/financeiro", label: "Financeiro", icon: WalletCards },
      { href: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/app/equipe", label: "Equipe", icon: UserRoundCog },
      { href: "/app/gestao", label: "Conta e plano", icon: Settings2 },
      { href: "/app/suporte", label: "Suporte", icon: CircleHelp },
    ],
  },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu principal" className="order-3 w-full md:order-none md:w-auto">
      <div className="flex items-center justify-between gap-2 py-1 md:hidden">
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
            pathname === "/app" ? "bg-secondary text-ink" : "text-muted",
          )}
        >
          <House aria-hidden="true" className="size-4" />
          Início
        </Link>
        <details className="group/mobile relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" className="size-4 text-primary" />
            Menu
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open/mobile:rotate-180" />
          </summary>
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-line bg-white p-3 shadow-[0_16px_45px_rgba(23,63,50,0.14)]">
            {groups.map((group, index) => (
              <section key={group.label} className={cn(index > 0 && "mt-3 border-t border-line pt-3")}>
                <p className="px-2 pb-1 text-xs font-semibold text-muted">{group.label}</p>
                <div className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => {
                    const current = isCurrent(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold",
                          current ? "bg-secondary text-ink" : "text-muted hover:bg-cream hover:text-ink",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </details>
      </div>

      <div className="hidden items-center gap-1 py-1 md:flex">
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
            pathname === "/app" ? "bg-secondary text-ink" : "text-muted hover:bg-cream hover:text-ink",
          )}
        >
          <House aria-hidden="true" className="size-4" />
          Início
        </Link>

        {groups.map((group) => {
          const active = group.items.some((item) => isCurrent(pathname, item.href));
          return (
            <details key={group.label} className="group/nav relative shrink-0">
              <summary
                className={cn(
                  "flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors marker:hidden [&::-webkit-details-marker]:hidden",
                  active ? "bg-secondary text-ink" : "text-muted hover:bg-cream hover:text-ink",
                )}
              >
                {group.label}
                <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open/nav:rotate-180" />
              </summary>
              <div
                className={cn(
                  "absolute top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-line bg-white p-2 shadow-[0_16px_45px_rgba(23,63,50,0.14)]",
                  group.align === "right" ? "right-0" : "left-0",
                )}
              >
                {group.items.map((item) => {
                  const current = isCurrent(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        current ? "bg-secondary text-ink" : "text-muted hover:bg-cream hover:text-ink",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4 text-primary" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
