"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";

export interface DashboardNavItem {
  href: string;
  label: string;
}

interface DashboardShellProps {
  title: string;
  navItems: DashboardNavItem[];
  isReady: boolean;
  children: React.ReactNode;
}

export function DashboardShell({ title, navItems, isReady, children }: DashboardShellProps) {
  const pathname = usePathname();

  if (!isReady) {
    return <LoadingState />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:gap-10">
      <aside className="lg:w-56 lg:shrink-0">
        <h1 className="px-2 text-xl font-bold tracking-tight">{title}</h1>
        <nav className="mt-4 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-light text-primary-dark"
                    : "text-muted hover:bg-black/3 hover:text-foreground dark:hover:bg-white/6"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
