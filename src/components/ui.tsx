import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { IconChevronRight, IconX } from "./icons";
import { Link } from "../router";

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm" };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20",
    secondary: "bg-white text-ink-700 border border-line hover:bg-slate-50",
    danger: "bg-bad-500 text-white hover:bg-bad-700 shadow-sm",
    success: "bg-ok-500 text-white hover:bg-ok-700 shadow-sm",
    ghost: "text-ink-500 hover:text-ink-900 hover:bg-slate-100",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl bg-card border border-line shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.03)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className = "",
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-line ${className}`}>
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      {action}
    </div>
  );
}

/* ---------------- Field wrappers ---------------- */
export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-ink-700">
      {children}
      {required && <span className="text-bad-500"> *</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} h-10 ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} py-2.5 resize-none ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${fieldBase} h-10 appearance-none pr-9 ${props.className ?? ""}`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

/* ---------------- Status badge ---------------- */
type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
const toneMap: Record<string, Tone> = {
  Completed: "ok",
  Paid: "ok",
  Active: "ok",
  Available: "ok",
  Approved: "ok",
  "In Repair": "info",
  "In Progress": "info",
  Diagnosed: "info",
  Scheduled: "info",
  Requested: "neutral",
  "Checked In": "info",
  "Awaiting Approval": "warn",
  "Pending Admin Review": "warn",
  "Awaiting Customer Approval": "warn",
  Issued: "ok",
  "Low Stock": "warn",
  "Out of Stock": "bad",
  Unpaid: "warn",
  Invited: "warn",
  Busy: "warn",
  Pending: "warn",
  Overdue: "bad",
  Cancelled: "bad",
  Suspended: "bad",
  Rejected: "bad",
  Off: "neutral",
  Assigned: "info",
  "On Hold": "warn",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneMap[status] ?? "neutral";
  const styles: Record<Tone, string> = {
    ok: "bg-ok-50 text-ok-700 ring-ok-500/20",
    warn: "bg-warn-50 text-warn-700 ring-warn-500/20",
    bad: "bg-bad-50 text-bad-700 ring-bad-500/20",
    info: "bg-brand-50 text-brand-700 ring-brand-500/20",
    neutral: "bg-slate-100 text-ink-500 ring-slate-400/20",
  };
  const dot: Record<Tone, string> = {
    ok: "bg-ok-500",
    warn: "bg-warn-500",
    bad: "bg-bad-500",
    info: "bg-brand-500",
    neutral: "bg-ink-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${styles[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
      {status}
    </span>
  );
}

/* ---------------- Table ---------------- */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export function Thead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-line">
        {cols.map((c) => (
          <th
            key={c}
            className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-ink-400"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}
export function Tr({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-line/70 last:border-0 hover:bg-slate-50/70 transition-colors ${className}`}>
      {children}
    </tr>
  );
}
export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 text-ink-700 align-middle ${className}`}>{children}</td>;
}

/* ---------------- Stat card ---------------- */
export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "brand",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "brand" | "ok" | "warn" | "bad";
  /** Makes the card a drill-down link. */
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    ok: "bg-ok-50 text-ok-700",
    warn: "bg-warn-50 text-warn-700",
    bad: "bg-bad-50 text-bad-700",
  };
  const body = (
    <Card className={`h-full p-5 ${onClick ? "transition-shadow group-hover:shadow-md group-hover:border-brand-500/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-500">{label}</p>
          <p className="mt-2 text-[28px] font-bold leading-none text-ink-900 tabular">{value}</p>
          {sub && <p className="mt-2 text-[12px] text-ink-400">{sub}</p>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
  if (!onClick) return body;
  return (
    <button type="button" onClick={onClick} className="group block w-full rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
      {body}
    </button>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
  scrollable = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  scrollable?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "overlay-in .15s ease-out" }}
    >
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full ${width} rounded-2xl bg-card shadow-2xl border border-line ${scrollable ? "flex max-h-full flex-col" : ""}`}
        style={{ animation: "modal-in .2s ease-out" }}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b border-line ${scrollable ? "shrink-0" : ""}`}>
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-slate-100 hover:text-ink-700"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className={`px-6 py-5 ${scrollable ? "min-h-0 overflow-y-auto" : ""}`}>{children}</div>
        {footer && (
          <div className={`flex justify-end gap-3 px-6 py-4 border-t border-line bg-slate-50/50 rounded-b-2xl ${scrollable ? "shrink-0" : ""}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
            active === t ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Timeline (repair status) ---------------- */
export function StageTracker({
  stages,
  current,
  dates = {},
}: {
  stages: string[];
  current: string;
  dates?: Record<string, string>;
}) {
  const idx = stages.indexOf(current);
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-[540px] items-start">
      {stages.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={`h-0.5 flex-1 ${i <= idx ? "bg-brand-500" : "bg-line"}`} />
              )}
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold ring-4 ${
                  done
                    ? "bg-brand-500 text-white ring-brand-50"
                    : active
                      ? "bg-brand-500 text-white ring-brand-100"
                      : "bg-white text-ink-400 ring-white border border-line"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              {i < stages.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < idx ? "bg-brand-500" : "bg-line"}`} />
              )}
            </div>
            <div className="mt-2 text-center">
              <p className={`text-[12px] font-semibold ${i <= idx ? "text-ink-900" : "text-ink-400"}`}>{s}</p>
              {dates[s] && <p className="text-[11px] text-ink-400">{dates[s]}</p>}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { at: string; label: string; kind: "info" | "ok" | "warn"; by?: string; role?: string; note?: string; stage?: string }[];
}) {
  const dot: Record<string, string> = {
    info: "bg-brand-500",
    ok: "bg-ok-500",
    warn: "bg-warn-500",
  };
  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-line" />
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${dot[it.kind]}`} />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink-900">{it.label}</p>
            {it.stage && <StatusBadge status={it.stage} />}
          </div>
          <p className="text-[12px] text-ink-400 tabular">
            {it.at}
            {it.by && <> · <span className="font-medium text-ink-500">{it.by}</span>{it.role ? ` (${it.role})` : ""}</>}
          </p>
          {it.note && <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-[12px] text-ink-700">{it.note}</p>}
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Page header / breadcrumbs ---------------- */
export function PageHeader({
  crumbs = [],
  title,
  subtitle,
  action,
}: {
  crumbs?: { label: string; to?: string }[];
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs.length > 0 && (
          <nav className="mb-2 flex items-center gap-1.5 text-[13px] text-ink-400">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {c.to ? (
                  <Link to={c.to} className="hover:text-brand-600">
                    {c.label}
                  </Link>
                ) : (
                  <span className={i === crumbs.length - 1 ? "text-ink-700 font-medium" : ""}>{c.label}</span>
                )}
                {i < crumbs.length - 1 && <IconChevronRight size={13} />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-ink-400">{icon}</div>
      <p className="font-semibold text-ink-700">{title}</p>
      {text && <p className="mt-1 text-sm text-ink-400">{text}</p>}
    </div>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

/* ---------------- Simple dropdown menu ---------------- */
export function Menu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 min-w-[200px] rounded-xl border border-line bg-white p-1.5 shadow-xl animate-in"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
export function MenuItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

export function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function money0(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

/* ---------------- Table search + pagination ---------------- */
export const PAGE_SIZES = [1, 20, 50];

/** Filters ALL records by the query first, then paginates the filtered result. */
export function useTableData<T>(items: T[], text: (item: T) => string, defaultSize = 20) {
  const [query, setQueryRaw] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultSize);
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((it) => text(it).toLowerCase().includes(q)) : items;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);
  return {
    query,
    setQuery: (v: string) => { setQueryRaw(v); setPage(1); },
    rows,
    total: filtered.length,
    page: current,
    pageCount,
    setPage,
    pageSize,
    setPageSize: (n: number) => { setPageSizeRaw(n); setPage(1); },
  };
}
type TableData = ReturnType<typeof useTableData<unknown>>;

export function TableSearch({ t, placeholder = "Search all records...", children }: { t: Pick<TableData, "query" | "setQuery" | "total">; placeholder?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
      <div className="relative w-full sm:max-w-[280px]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <Input value={t.query} onChange={(e) => t.setQuery(e.target.value)} placeholder={placeholder} className="!pl-9" />
      </div>
      {children}
      <span className="text-[13px] text-ink-400 sm:ml-auto">{t.total} {t.total === 1 ? "record" : "records"}</span>
    </div>
  );
}

export function Pagination({ t }: { t: Pick<TableData, "page" | "pageCount" | "setPage" | "pageSize" | "setPageSize" | "total"> }) {
  const { page, pageCount, setPage } = t;
  // Compact page list: first, last, and a window around the current page.
  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const from = t.total === 0 ? 0 : (page - 1) * t.pageSize + 1;
  const to = Math.min(page * t.pageSize, t.total);
  const btn = "h-8 min-w-8 rounded-lg px-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-ink-500">
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <select
          value={t.pageSize}
          onChange={(e) => t.setPageSize(+e.target.value)}
          className="h-8 rounded-lg border border-line bg-white px-2 text-[13px] text-ink-900 focus:border-brand-500 focus:outline-none"
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="tabular">{from}–{to} of {t.total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button className={`${btn} border border-line bg-white text-ink-700 hover:bg-slate-50`} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-ink-400">…</span>
          ) : (
            <button key={n} onClick={() => setPage(n)} className={`${btn} tabular ${n === page ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-slate-100"}`}>{n}</button>
          ),
        )}
        <button className={`${btn} border border-line bg-white text-ink-700 hover:bg-slate-50`} disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

/** Empty row for filtered tables. */
export function NoRows({ cols }: { cols: number }) {
  return (
    <tr><td colSpan={cols} className="px-5 py-10 text-center text-sm text-ink-400">No matching records found.</td></tr>
  );
}
