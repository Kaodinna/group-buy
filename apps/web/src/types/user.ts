export type Role = "CUSTOMER" | "SELLER" | "ADMIN";

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
  referralCode: string;
  referredBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}
