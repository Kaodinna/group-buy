export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-soft">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
