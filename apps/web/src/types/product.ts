export type ProductStatus = "PENDING" | "ACTIVE" | "REJECTED" | "ARCHIVED";

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
}

export interface PopulatedProductSeller {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Product {
  _id: string;
  sellerId: string | PopulatedProductSeller;
  name: string;
  slug: string;
  description: string;
  images: string[];
  categoryId: string;
  originalPrice: number;
  currency: string;
  stock: number;
  specifications?: Record<string, string>;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}
