/**
 * Inbox timestamp formatting.
 *
 * Both helpers deliberately use the *viewer's* locale and timezone (no explicit
 * locale argument), which means the server render and the client render can
 * disagree — the Node process is UTC, the browser usually isn't. Every call site
 * therefore renders through `<time suppressHydrationWarning>` and lets the client
 * value win; the alternative (formatting only after mount) costs a visible flash
 * on every row for no real benefit.
 */

const DAY_MS = 86_400_000;

/** Local midnight for `d`, so day deltas count calendar days rather than 24h spans. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Compact form for a dense list: clock time for today, "Yesterday", a weekday
 * within the past week, then a date. Mirrors how mail clients collapse older
 * mail — precision matters most for recent items.
 */
export function formatReceivedAt(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);

  // Negative days = a future timestamp (clock skew, or seed data dated ahead);
  // show the clock time rather than an absurd "in -3 days".
  if (days <= 0) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });

  return d.toLocaleDateString(
    undefined,
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}

/** Unabbreviated form for the detail header and for `title` tooltips on compact times. */
export function formatReceivedAtFull(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
