/** Local-date helpers (all ISO strings are YYYY-MM-DD in local time). */
export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fromIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** Monday of the week containing `d`. */
export function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(x, -dow);
}
export function weekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function fmtRange(a: Date, b: Date) {
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${fmtDay(a)} – ${b.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${sameYear ? "" : ""}`;
}
/** Parse activity stamps like "May 18, 2025 09:10 AM" or "May 18, 2025, 9:10 AM". */
export function parseStamp(at: string) {
  const t = Date.parse(at.replace(/(\d{4}),/, "$1"));
  return Number.isNaN(t) ? 0 : t;
}

export type Range = "This Week" | "This Month" | "All Time";
export const RANGES: Range[] = ["This Week", "This Month", "All Time"];

/** Inclusive [from, to] ISO bounds for a dashboard range. */
export function rangeBounds(r: Range): { from: string; to: string } | null {
  const today = new Date();
  if (r === "This Week") {
    const m = startOfWeek(today);
    return { from: iso(m), to: iso(addDays(m, 6)) };
  }
  if (r === "This Month") {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }
  return null;
}

/** Chart buckets for a range: days of this week, weeks of this month, or the last 6 months. */
export function rangeBuckets(r: Range): { label: string; from: string; to: string }[] {
  const today = new Date();
  if (r === "This Week") {
    return weekDays(startOfWeek(today)).map((d, i) => ({ label: DAY_NAMES[i], from: iso(d), to: iso(d) }));
  }
  if (r === "This Month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const out: { label: string; from: string; to: string }[] = [];
    let start = first;
    let n = 1;
    while (start <= last) {
      const end = addDays(startOfWeek(start), 6) > last ? last : addDays(startOfWeek(start), 6);
      out.push({ label: `W${n++}`, from: iso(start), to: iso(end) });
      start = addDays(end, 1);
    }
    return out;
  }
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      from: iso(d),
      to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  });
}
export const inRange = (date: string, b: { from: string; to: string } | null) => !b || (date >= b.from && date <= b.to);
