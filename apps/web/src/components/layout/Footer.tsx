import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} GroupBuy. All rights reserved.</p>
        <nav className="flex gap-6">
          <Link href="/group-buys" className="hover:text-foreground">
            Browse
          </Link>
          <Link href="/seller" className="hover:text-foreground">
            Become a seller
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
    </footer>
  );
}
