import type { CampaignStatus } from "@/types/campaign";

// Solid, opaque colors (not tinted/translucent) - this badge is often
// overlaid on a product photo, where a low-opacity background loses
// legibility against busy image content. The leading glyph is what carries
// the "soft status" feel the rest of the design system uses.
const STYLES: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-600 text-white",
  ACTIVE: "bg-primary text-white",
  SUCCESSFUL: "bg-success text-white",
  FAILED: "bg-error text-white",
  CANCELLED: "bg-error text-white",
  COMPLETED: "bg-blue-600 text-white",
};

const CONTENT: Record<CampaignStatus, { glyph: string; label: string }> = {
  DRAFT: { glyph: "●", label: "Draft" },
  ACTIVE: { glyph: "●", label: "Active" },
  SUCCESSFUL: { glyph: "✓", label: "Successful" },
  FAILED: { glyph: "×", label: "Failed" },
  CANCELLED: { glyph: "×", label: "Cancelled" },
  COMPLETED: { glyph: "✓", label: "Completed" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const { glyph, label } = CONTENT[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-soft ${STYLES[status]}`}
    >
      <span aria-hidden className="text-[10px]">
        {glyph}
      </span>
      {label}
    </span>
  );
}
