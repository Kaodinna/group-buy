"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { apiClient, ApiError } from "@/lib/api-client";
import { authFetch } from "@/lib/auth-fetch";
import { LoadingState } from "@/components/ui/LoadingState";
import { ImageUploader } from "@/components/products/ImageUploader";
import { PriceDisplay } from "@/components/group-buys/PriceDisplay";
import { DiscountBadge } from "@/components/group-buys/DiscountBadge";
import { formatMoney } from "@/lib/format";
import type { Product, Category } from "@/types/product";
import type { PaginatedResult } from "@/types/pagination";
import type { GroupBuyCampaign } from "@/types/campaign";

const campaignSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    title: z.string().min(3, "Title is too short").max(140),
    description: z.string().min(10, "Description is too short").max(5000),
    groupPrice: z.number().int().positive("Enter a valid price"),
    minimumParticipants: z.number().int().min(2, "Minimum is 2 participants"),
    maximumParticipants: z.number().int().min(2),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    shippingInfo: z.string().max(500).optional(),
  })
  .refine((data) => data.maximumParticipants >= data.minimumParticipants, {
    message: "Maximum must be at least the minimum",
    path: ["maximumParticipants"],
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

type CampaignFormValues = z.infer<typeof campaignSchema>;

const productSchema = z.object({
  name: z.string().min(3).max(140),
  description: z.string().min(10).max(5000),
  categoryId: z.string().min(1, "Select a category"),
  originalPrice: z.number().int().positive(),
  stock: z.number().int().min(0),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function CreateCampaignPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [productJustSubmitted, setProductJustSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      authFetch.get<PaginatedResult<Product>>(`/products?sellerId=${user.id}&limit=100`),
      apiClient.get<Category[]>("/categories"),
    ])
      .then(([productsRes, cats]) => {
        if (cancelled) return;
        setProducts(productsRes.items.filter((p) => p.status === "ACTIVE"));
        setCategories(cats);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (products === null) return <LoadingState />;

  if (loadError) {
    return <p className="text-sm text-error">{loadError}</p>;
  }

  if (productJustSubmitted) {
    return (
      <div className="max-w-lg rounded-3xl bg-surface p-6 text-center shadow-soft">
        <h2 className="text-lg font-bold">Product submitted for approval</h2>
        <p className="mt-2 text-sm text-muted">
          An admin needs to approve your product before you can create a campaign for it. Check back soon.
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <ProductForm
        categories={categories}
        onSubmitted={() => setProductJustSubmitted(true)}
      />
    );
  }

  return <CampaignForm products={products} onCreated={(id) => router.push(`/seller/campaigns/${id}`)} />;
}

function ProductForm({
  categories,
  onSubmitted,
}: {
  categories: Category[];
  onSubmitted: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({ resolver: zodResolver(productSchema) });

  const onSubmit = async (values: ProductFormValues) => {
    setFormError(null);
    try {
      await authFetch.post("/products", { ...values, images });
      onSubmitted();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold tracking-tight">Create a product first</h2>
      <p className="mt-1 text-sm text-muted">
        You need at least one approved product before you can start a group buy campaign.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-soft">
        <Field label="Product name" error={errors.name?.message}>
          <input {...register("name")} className={inputClass} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea rows={4} {...register("description")} className={inputClass} />
        </Field>
        <Field label="Category" error={errors.categoryId?.message}>
          <select {...register("categoryId")} className={inputClass}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Photos (optional)">
          <ImageUploader images={images} onChange={setImages} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Original price (NGN)" error={errors.originalPrice?.message}>
            <input type="number" {...register("originalPrice", { valueAsNumber: true })} className={inputClass} />
          </Field>
          <Field label="Stock" error={errors.stock?.message}>
            <input type="number" {...register("stock", { valueAsNumber: true })} className={inputClass} />
          </Field>
        </div>

        {formError && <p className="text-sm text-error">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit product for approval"}
        </button>
      </form>
    </div>
  );
}

function CampaignForm({
  products,
  onCreated,
}: {
  products: Product[];
  onCreated: (id: string) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { productId: products[0]._id },
  });

  const productId = watch("productId");
  const title = watch("title");
  const groupPrice = watch("groupPrice");
  const minimumParticipants = watch("minimumParticipants");
  const maximumParticipants = watch("maximumParticipants");
  const selectedProduct = products.find((p) => p._id === productId);

  const onSubmit = async (values: CampaignFormValues) => {
    setFormError(null);
    try {
      const campaign = await authFetch.post<GroupBuyCampaign>("/group-buys", {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      });
      onCreated(campaign._id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">Create a Group Buy</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-soft">
          <Field label="Product" error={errors.productId?.message}>
            <select {...register("productId")} className={inputClass}>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({formatMoney(p.originalPrice)})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Campaign title" error={errors.title?.message}>
            <input {...register("title")} className={inputClass} placeholder={selectedProduct?.name} />
          </Field>

          <Field label="Description" error={errors.description?.message}>
            <textarea rows={4} {...register("description")} className={inputClass} />
          </Field>

          <Field label="Group price (NGN)" error={errors.groupPrice?.message}>
            <input type="number" {...register("groupPrice", { valueAsNumber: true })} className={inputClass} />
          </Field>
          {selectedProduct && groupPrice > 0 && groupPrice < selectedProduct.originalPrice && (
            <p className="-mt-2 text-xs font-medium text-primary-dark">
              Save {formatMoney(selectedProduct.originalPrice - groupPrice)} (
              {Math.round(((selectedProduct.originalPrice - groupPrice) / selectedProduct.originalPrice) * 100)}%) vs
              the original price of {formatMoney(selectedProduct.originalPrice)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum participants" error={errors.minimumParticipants?.message}>
              <input type="number" {...register("minimumParticipants", { valueAsNumber: true })} className={inputClass} />
            </Field>
            <Field label="Maximum participants" error={errors.maximumParticipants?.message}>
              <input type="number" {...register("maximumParticipants", { valueAsNumber: true })} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" error={errors.startDate?.message}>
              <input type="datetime-local" {...register("startDate")} className={inputClass} />
            </Field>
            <Field label="End date" error={errors.endDate?.message}>
              <input type="datetime-local" {...register("endDate")} className={inputClass} />
            </Field>
          </div>

          <Field label="Shipping information (optional)" error={errors.shippingInfo?.message}>
            <input {...register("shippingInfo")} className={inputClass} placeholder="e.g. Ships within 3-5 days" />
          </Field>

          {formError && <p className="text-sm text-error">{formError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create campaign"}
          </button>
        </form>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
          <div className="overflow-hidden rounded-3xl bg-surface shadow-soft">
            <div className="relative aspect-4/3 bg-black/5 dark:bg-white/5">
              {selectedProduct?.images?.[0] ? (
                <Image src={selectedProduct.images[0]} alt="" fill className="object-cover" sizes="320px" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">No image</div>
              )}
              {selectedProduct && groupPrice > 0 && (
                <div className="absolute left-3 top-3">
                  <DiscountBadge originalPrice={selectedProduct.originalPrice} groupPrice={groupPrice} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 p-4">
              <h3 className="line-clamp-2 font-semibold text-foreground">
                {title || selectedProduct?.name || "Your campaign title"}
              </h3>
              {selectedProduct && (
                <PriceDisplay
                  originalPrice={selectedProduct.originalPrice}
                  groupPrice={groupPrice > 0 ? groupPrice : selectedProduct.originalPrice}
                  size="sm"
                />
              )}
              <div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-light">
                  <div className="h-full w-0 rounded-full bg-primary" />
                </div>
                <p className="mt-2 text-xs text-muted">
                  0 / {minimumParticipants > 0 ? minimumParticipants : "?"} joined ·{" "}
                  {maximumParticipants > 0 ? maximumParticipants : "?"} max
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
