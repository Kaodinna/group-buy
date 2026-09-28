"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient, ApiError } from "@/lib/api-client";
import { dashboardHrefFor } from "@/lib/dashboard-href";
import { useAuthStore } from "@/store/auth-store";
import type { PublicUser } from "@/types/user";

const schema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["CUSTOMER", "SELLER"]),
});

type FormValues = z.infer<typeof schema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [formError, setFormError] = useState<string | null>(null);

  const referralCode = searchParams.get("ref") ?? undefined;
  const defaultRole = searchParams.get("role") === "SELLER" ? "SELLER" : "CUSTOMER";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const data = await apiClient.post<{ user: PublicUser; accessToken: string }>("/auth/register", {
        ...values,
        referralCode,
      });
      setAuth(data.user, data.accessToken);
      router.push(dashboardHrefFor(data.user.role));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        {referralCode ? "You were invited by a friend — welcome!" : "Join to start saving with group buys."}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">First name</label>
            <input
              {...register("firstName")}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-error">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Last name</label>
            <input
              {...register("lastName")}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-error">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <input
            type="tel"
            {...register("phone")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            autoComplete="new-password"
            {...register("password")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-error">{errors.password.message}</p>
          )}
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">I want to</span>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" value="CUSTOMER" {...register("role")} /> Shop
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="SELLER" {...register("role")} /> Sell products
            </label>
          </div>
        </div>

        {formError && <p className="text-sm text-error">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary-dark hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
