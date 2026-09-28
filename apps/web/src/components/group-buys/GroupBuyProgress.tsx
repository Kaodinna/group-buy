interface GroupBuyProgressProps {
  currentParticipants: number;
  minimumParticipants: number;
  maximumParticipants: number;
  // Whether this campaign can still accept joins. Once a campaign is
  // failed/cancelled/completed, "X more needed" or "deal unlocked" reads as
  // false urgency about a group that's no longer moving - so those lines
  // (and the bar's live color) are suppressed for anything not still active.
  isActive?: boolean;
}

export function GroupBuyProgress({
  currentParticipants,
  minimumParticipants,
  maximumParticipants,
  isActive = true,
}: GroupBuyProgressProps) {
  const percent = Math.min(100, Math.round((currentParticipants / minimumParticipants) * 100));
  const remaining = Math.max(0, minimumParticipants - currentParticipants);
  const reachedMinimum = currentParticipants >= minimumParticipants;

  return (
    <div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${isActive ? "bg-primary-light" : "bg-black/5 dark:bg-white/10"}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${isActive ? "bg-primary" : "bg-gray-400"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">
          {currentParticipants} / {minimumParticipants} joined
        </span>
        <span className="text-muted">{maximumParticipants} max</span>
      </div>
      {isActive && !reachedMinimum && remaining > 0 && (
        <p className="mt-1 text-xs font-semibold text-primary-dark">
          Only {remaining} more {remaining === 1 ? "person" : "people"} needed!
        </p>
      )}
      {isActive && reachedMinimum && (
        <p className="mt-1 text-xs font-semibold text-primary-dark">Minimum reached — deal unlocked!</p>
      )}
    </div>
  );
}
