import type { ShippingAddress } from "./participant";

export type OrderPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface OrderItem {
  productId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PopulatedOrderCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Order {
  _id: string;
  userId: string | PopulatedOrderCustomer;
  campaignId: string;
  productId: string;
  sellerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderStatus;
  shippingAddress: ShippingAddress | null;
  createdAt: string;
  updatedAt: string;
}
