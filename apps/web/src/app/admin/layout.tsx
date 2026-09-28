"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/payments", label: "Payments" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isReady } = useRequireAuth(["ADMIN"]);

  return (
    <DashboardShell title="Admin Dashboard" navItems={NAV_ITEMS} isReady={isReady}>
      {children}
    </DashboardShell>
  );
}
