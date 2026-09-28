const COLORS = ["bg-primary", "bg-accent", "bg-blue-500", "bg-purple-500", "bg-pink-500"];

/**
 * Participant identities are private (the participants list endpoint is
 * seller/admin only), so this renders generic placeholder avatars sized to
 * the count - social proof without leaking who joined.
 */
export function ParticipantAvatars({ count }: { count: number }) {
  if (count <= 0) return null;
  const shown = Math.min(count, 5);
  const overflow = count - shown;

  return (
    <div className="flex items-center">
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          className={`-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white first:ml-0 ${COLORS[i % COLORS.length]}`}
        >
          {i + 1}
        </span>
      ))}
      {overflow > 0 && (
        <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-black/10 text-[10px] font-bold text-foreground dark:bg-white/10">
          +{overflow}
        </span>
      )}
    </div>
  );
}
