"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/group-buys", label: "My Group Buys" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/notifications", label: "Notifications" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isReady } = useRequireAuth();

  return (
    <DashboardShell title="My Account" navItems={NAV_ITEMS} isReady={isReady}>
      {children}
    </DashboardShell>
  );
}
