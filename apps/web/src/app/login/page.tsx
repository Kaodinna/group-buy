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
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const data = await apiClient.post<{ user: PublicUser; accessToken: string }>(
        "/auth/login",
        values,
      );
      setAuth(data.user, data.accessToken);
      router.push(searchParams.get("redirect") || dashboardHrefFor(data.user.role));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Log in to continue to your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
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
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-error">{errors.password.message}</p>
          )}
        </div>

        {formError && <p className="text-sm text-error">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary-dark hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
