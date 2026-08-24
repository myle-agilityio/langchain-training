import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isValid,
} from "date-fns";

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, {
  style: "narrow",
  numeric: "always",
});

export const formatReceivedAt = (
  iso: string,
  now: Date = new Date(),
): string => {
  const d = new Date(iso);
  if (!isValid(d)) return "";

  const days = differenceInCalendarDays(now, d);

  if (days <= 0) return format(d, "h:mm a");
  if (days === 1) return "Yesterday";
  if (days < 7) return format(d, "EEE");

  return d.getFullYear() === now.getFullYear()
    ? format(d, "MMM d")
    : format(d, "MMM d, yyyy");
};

export const formatReceivedAtFull = (iso: string): string => {
  const d = new Date(iso);
  return isValid(d) ? d.toLocaleString() : "";
};

export const formatRelative = (iso: string, now: Date = new Date()): string => {
  const d = new Date(iso);
  if (!isValid(d)) return "";

  const minutes = differenceInMinutes(now, d, { roundingMethod: "round" });
  if (minutes < 1) return "just now";
  if (minutes < 60) return relativeTimeFormat.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relativeTimeFormat.format(-hours, "hour");
  return relativeTimeFormat.format(-Math.round(hours / 24), "day");
};
