import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { Product } from "@/types/product";
import { PriceDisplay } from "@/components/group-buys/PriceDisplay";
import { DiscountBadge } from "@/components/group-buys/DiscountBadge";
import { CampaignStatusBadge } from "@/components/group-buys/CampaignStatusBadge";
import { GroupBuyProgress } from "@/components/group-buys/GroupBuyProgress";
import { CountdownTimer } from "@/components/group-buys/CountdownTimer";
import { ParticipantAvatars } from "@/components/group-buys/ParticipantAvatars";
import { JoinGroupBuyButton } from "@/components/group-buys/JoinGroupBuyButton";
import { MobileJoinBar } from "@/components/group-buys/MobileJoinBar";
import { formatMoney, formatPercent } from "@/lib/format";

const FAQS = [
  {
    question: "What happens if the group doesn't reach the minimum?",
    answer:
      "If the campaign ends without enough participants, it's marked as failed and every participant who paid is automatically refunded to their original payment method.",
  },
  {
    question: "When am I charged?",
    answer:
      "You pay when you join, at the group price shown. Your spot is reserved immediately - you're not charged again if more people join later.",
  },
  {
    question: "Can I cancel after joining?",
    answer:
      "You can cancel from your dashboard while the campaign is still active. Once the group buy succeeds and your order is placed, cancellation follows the seller's standard order policy.",
  },
];

async function getCampaign(slug: string): Promise<GroupBuyCampaign | null> {
  try {
    return await apiClient.get<GroupBuyCampaign>(`/group-buys/${slug}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function getProduct(productId: string): Promise<Product | null> {
  try {
    return await apiClient.get<Product>(`/products/${productId}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function CampaignDetailPage({
  params,
}: PageProps<"/group-buys/[slug]">) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();

  const product = await getProduct(campaign.productId);
  const image = campaign.image ?? product?.images?.[0] ?? null;
  const savings = campaign.originalPrice - campaign.groupPrice;
  const percent = formatPercent(campaign.originalPrice, campaign.groupPrice);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 pb-24 sm:px-6 sm:py-12 sm:pb-12">
      <Link href="/group-buys" className="text-sm font-medium text-muted hover:text-foreground">
        &larr; Back to Group Buys
      </Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-black/5 shadow-soft dark:bg-white/5">
          {image ? (
            <Image
              src={image}
              alt={campaign.title}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 100vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">No image</div>
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            <DiscountBadge originalPrice={campaign.originalPrice} groupPrice={campaign.groupPrice} />
            <CampaignStatusBadge status={campaign.status} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{campaign.title}</h1>
            <div className="mt-4">
              <PriceDisplay
                originalPrice={campaign.originalPrice}
                groupPrice={campaign.groupPrice}
                currency={campaign.currency}
                showSavings={false}
              />
              {savings > 0 && (
                <span className="mt-2 inline-flex w-fit items-center rounded-full bg-success-light px-3 py-1 text-sm font-semibold text-primary-dark">
                  Save {formatMoney(savings, campaign.currency)} ({percent}%)
                </span>
              )}
            </div>
          </div>

          <div id="join-panel" className="rounded-3xl bg-surface p-5 shadow-soft">
            <GroupBuyProgress
              currentParticipants={campaign.currentParticipants}
              minimumParticipants={campaign.minimumParticipants}
              maximumParticipants={campaign.maximumParticipants}
              isActive={campaign.status === "ACTIVE"}
            />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <ParticipantAvatars count={campaign.currentParticipants} />
              <div className="text-right">
                <p className="text-xs text-muted">Ends in</p>
                <CountdownTimer endDate={campaign.endDate} />
              </div>
            </div>
          </div>

          <JoinGroupBuyButton campaign={campaign} />

          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{campaign.description}</p>
          </div>

          {product?.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="border-t border-border pt-6">
              <h2 className="text-lg font-semibold">Specifications</h2>
              <dl className="mt-3 divide-y divide-border text-sm">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 py-2">
                    <dt className="text-muted">{key}</dt>
                    <dd className="text-right font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {campaign.shippingInfo && (
            <div className="border-t border-border pt-6">
              <h2 className="text-lg font-semibold">Shipping</h2>
              <p className="mt-2 text-sm text-muted">{campaign.shippingInfo}</p>
            </div>
          )}
        </div>
      </div>

      <section className="mx-auto mt-16 max-w-3xl border-t border-border pt-12">
        <h2 className="text-center text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 flex flex-col divide-y divide-border">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                {faq.question}
                <span className="shrink-0 text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <MobileJoinBar campaign={campaign} />
    </div>
  );
}
