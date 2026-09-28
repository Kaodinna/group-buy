export type CampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUCCESSFUL"
  | "FAILED"
  | "CANCELLED"
  | "COMPLETED";

export interface GroupBuyCampaign {
  _id: string;
  productId: string;
  sellerId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  originalPrice: number;
  groupPrice: number;
  currency: string;
  minimumParticipants: number;
  maximumParticipants: number;
  currentParticipants: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  paymentDeadline: string | null;
  image: string | null;
  shippingInfo: string | null;
  createdAt: string;
  updatedAt: string;
}
