// Utilities for handling Vietnam timezone (UTC+7) consistently across the app.
// Always pass UTC timestamps from the DB; these functions render them in VN time.

const TZ = "Asia/Ho_Chi_Minh";

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  return new Date(input);
}

/** Current moment as a Date object whose wall-clock fields equal Vietnam time. */
export function nowVN(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

/** "10/05/2026 10:45" */
export function formatVN(date: Date | string | number): string {
  return toDate(date).toLocaleString("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "10:45" */
export function timeVN(date: Date | string | number): string {
  return toDate(date).toLocaleString("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "10/05/2026" */
export function dateVN(date: Date | string | number): string {
  return toDate(date).toLocaleDateString("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Split into time + date for two-line table cells. */
export function splitVN(date: Date | string | number): { time: string; date: string } {
  return { time: timeVN(date), date: dateVN(date) };
}

/** "10:45:30" — for live clocks. */
export function timeVNWithSeconds(date: Date | string | number): string {
  return toDate(date).toLocaleString("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}