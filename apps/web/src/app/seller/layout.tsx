"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/seller", label: "Overview" },
  { href: "/seller/campaigns", label: "Campaigns" },
  { href: "/seller/campaigns/create", label: "Create Campaign" },
  { href: "/seller/orders", label: "Orders" },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { isReady } = useRequireAuth(["SELLER", "ADMIN"]);

  return (
    <DashboardShell title="Seller Dashboard" navItems={NAV_ITEMS} isReady={isReady}>
      {children}
    </DashboardShell>
  );
}
