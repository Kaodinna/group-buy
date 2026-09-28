import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { Category } from "@/types/product";
import type { PaginatedResult } from "@/types/pagination";
import { GroupBuyCard } from "@/components/group-buys/GroupBuyCard";
import { EmptyState } from "@/components/ui/EmptyState";

async function getCampaigns(sort: string): Promise<PaginatedResult<GroupBuyCampaign>> {
  try {
    return await apiClient.get<PaginatedResult<GroupBuyCampaign>>(
      `/group-buys?sort=${sort}&limit=6`,
      { cache: "no-store" },
    );
  } catch {
    return { items: [], total: 0, page: 1, limit: 6, totalPages: 1 };
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    return await apiClient.get<Category[]>("/categories", { cache: "no-store" });
  } catch {
    return [];
  }
}

const STEPS = [
  {
    title: "Find a deal",
    description: "Browse products with a group price that only unlocks once enough people join.",
  },
  {
    title: "Join with others",
    description: "Reserve your spot and pay securely. Your price locks in the moment you join.",
  },
  {
    title: "Deal unlocks",
    description: "Once the minimum is reached, everyone's order is confirmed at the group price.",
  },
];

export default async function Home() {
  const [active, endingSoon, popular, categories] = await Promise.all([
    getCampaigns("newest"),
    getCampaigns("ending_soon"),
    getCampaigns("most_joined"),
    getCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Buy together. <span className="text-primary">Save together.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Join group-buy campaigns with other shoppers to unlock lower prices on the products you
          already want.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/group-buys"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Browse group buys
          </Link>
          <Link
            href="/#how-it-works"
            className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold transition-colors hover:bg-black/3 dark:hover:bg-white/6"
          >
            How it works
          </Link>
        </div>
        {active.total > 0 && (
          <p className="mt-8 text-sm text-muted">
            <span className="font-semibold text-foreground">{active.total}</span> group buy
            {active.total === 1 ? "" : "s"} live right now
          </p>
        )}
      </section>

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Link
                key={category._id}
                href={`/group-buys?categoryId=${category._id}`}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary-dark"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Section title="Active group buys" viewAllHref="/group-buys">
        {active.items.length === 0 ? (
          <EmptyState title="No active group buys yet" description="Check back soon for new deals." />
        ) : (
          <CampaignGrid campaigns={active.items} />
        )}
      </Section>

      <Section title="Ending soon" viewAllHref="/group-buys?sort=ending_soon">
        {endingSoon.items.length === 0 ? (
          <EmptyState title="Nothing ending soon" description="Check back later for time-limited deals." />
        ) : (
          <CampaignGrid campaigns={endingSoon.items} />
        )}
      </Section>

      <Section title="Popular group buys" viewAllHref="/group-buys?sort=most_joined">
        {popular.items.length === 0 ? (
          <EmptyState title="Nothing popular yet" description="Be the first to join a deal." />
        ) : (
          <CampaignGrid campaigns={popular.items} />
        )}
      </Section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold">How group buying works</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary-light font-bold text-primary-dark">
                {i + 1}
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-primary-light/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Ready to save on your next purchase?</h2>
          <p className="mt-2 text-muted">Browse live group buys and lock in your price today.</p>
          <Link
            href="/group-buys"
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Browse group buys
          </Link>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <Link href={viewAllHref} className="text-sm font-medium text-primary-dark hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function CampaignGrid({ campaigns }: { campaigns: GroupBuyCampaign[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <GroupBuyCard key={campaign._id} campaign={campaign} />
      ))}
    </div>
  );
}
