export type NotificationType =
  | "CAMPAIGN_ALMOST_COMPLETE"
  | "CAMPAIGN_SUCCESSFUL"
  | "CAMPAIGN_FAILED"
  | "PAYMENT_SUCCESSFUL"
  | "REFUND_PROCESSED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
