import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
