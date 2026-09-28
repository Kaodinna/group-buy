export type ParticipantStatus = "PENDING" | "PAID" | "CONFIRMED" | "REFUNDED" | "CANCELLED";

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  phone: string;
}

export interface PopulatedCampaignSummary {
  _id: string;
  title: string;
  slug: string;
  image: string | null;
  status: string;
  originalPrice: number;
  groupPrice: number;
  currentParticipants: number;
  minimumParticipants: number;
  maximumParticipants: number;
  endDate: string;
}

export interface GroupBuyParticipant {
  _id: string;
  campaignId: string | PopulatedCampaignSummary;
  userId:
    | string
    | { _id: string; firstName: string; lastName: string; email?: string; avatar?: string | null };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: ParticipantStatus;
  paymentId: string | null;
  orderId: string | null;
  joinedAt: string;
  expiresAt: string;
  shippingAddress?: ShippingAddress | null;
  createdAt: string;
  updatedAt: string;
}
