"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { dashboardHrefFor } from "@/lib/dashboard-href";

export function Navbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const logout = useAuthStore((state) => state.logout);
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push("/");
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    setMenuOpen(false);
    router.push(trimmed ? `/group-buys?search=${encodeURIComponent(trimmed)}` : "/group-buys");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-foreground">
          Group<span className="text-primary">Buy</span>
        </Link>

        <nav className="hidden shrink-0 items-center gap-6 text-sm font-medium text-muted lg:flex">
          <Link href="/group-buys" className="hover:text-foreground">
            Group Buys
          </Link>
          <Link href="/#how-it-works" className="hover:text-foreground">
            How It Works
          </Link>
          {user && (
            <Link href={dashboardHrefFor(user.role)} className="hover:text-foreground">
              Dashboard
            </Link>
          )}
          {(!user || user.role === "SELLER") && (
            <Link href={user ? "/seller" : "/register?role=SELLER"} className="hover:text-foreground">
              Sell
            </Link>
          )}
        </nav>

        <form onSubmit={handleSearchSubmit} className="mx-auto hidden max-w-sm flex-1 sm:block">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0Z" />
            </svg>
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search group buys…"
              aria-label="Search group buys"
              className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {!hasHydrated ? null : user ? (
            <>
              <NotificationBell />
              <span className="hidden text-sm text-muted lg:inline">Hi, {user.firstName}</span>
              <button
                onClick={handleLogout}
                className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/3 lg:block dark:hover:bg-white/6"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-muted hover:text-foreground lg:block">
                Log in
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark lg:block"
              >
                Sign up
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="rounded-full p-2 text-foreground transition-colors hover:bg-black/3 lg:hidden dark:hover:bg-white/6"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 sm:px-6 lg:hidden">
          <form onSubmit={handleSearchSubmit} className="sm:hidden">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0Z" />
              </svg>
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search group buys…"
                aria-label="Search group buys"
                className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </form>

          <nav className="mt-4 flex flex-col gap-1 text-sm font-medium sm:mt-0">
            <Link
              href="/group-buys"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 text-foreground hover:bg-black/3 dark:hover:bg-white/6"
            >
              Group Buys
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 text-foreground hover:bg-black/3 dark:hover:bg-white/6"
            >
              How It Works
            </Link>
            {user && (
              <Link
                href={dashboardHrefFor(user.role)}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-foreground hover:bg-black/3 dark:hover:bg-white/6"
              >
                Dashboard
              </Link>
            )}
            {(!user || user.role === "SELLER") && (
              <Link
                href={user ? "/seller" : "/register?role=SELLER"}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-foreground hover:bg-black/3 dark:hover:bg-white/6"
              >
                Sell
              </Link>
            )}

            <div className="mt-2 border-t border-border pt-3">
              {!hasHydrated ? null : user ? (
                <button
                  onClick={handleLogout}
                  className="w-full rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-black/3 dark:hover:bg-white/6"
                >
                  Log out
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-black/3 dark:hover:bg-white/6"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-dark"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
