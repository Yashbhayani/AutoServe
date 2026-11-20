import {
  createContext,
  useContext,
  useEffect,
  useId,
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

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
export function Button({
  type = "button",
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
    <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-card border border-line shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.03)] ${className}`}
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

export function Label({ children, required, htmlFor, id }: { children: ReactNode; required?: boolean; htmlFor?: string; id?: string }) {
  return (
    <label id={id} htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-700">
      {children}
      {required && <span className="text-bad-500"> *</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

const FieldContext = createContext<string | undefined>(undefined);

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = useContext(FieldContext);
  return <input id={props.type === "checkbox" || props.type === "radio" ? undefined : fieldId} {...props} className={`${fieldBase} h-10 ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = useContext(FieldContext);
  return <textarea id={fieldId} {...props} className={`${fieldBase} py-2.5 resize-none ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = useContext(FieldContext);
  return (
    <div className="relative">
      <select
        id={fieldId}
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
  const id = useId();
  return (
    <div className={className} role="group" aria-labelledby={`${id}-label`}>
      <Label id={`${id}-label`} htmlFor={id} required={required}>{label}</Label>
      <FieldContext.Provider value={id}>{children}</FieldContext.Provider>
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
const toneMap: Record<string, Tone> = {
  Completed: "ok",
  Paid: "ok",
  Active: "ok",
  Available: "ok",
  Approved: "ok",
  "Repair": "info",
  "In Progress": "info",
  Diagnosis: "info",
  Scheduled: "info",
  "Service Requested": "neutral",
  "Vehicle Checked In": "info",
  "Awaiting Approval": "warn",
  "Customer Approval": "warn",
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

const openDialogs: HTMLElement[] = [];

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
  scrollable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  scrollable?: boolean;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs.push(element);
    const focusable = () => Array.from(element.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]'))
      .filter((control) => !control.hasAttribute("disabled") && control.tabIndex >= 0 && control.getClientRects().length > 0);
    (focusable()[0] ?? element).focus();
    const onKey = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== element) return;
      if (e.key === "Escape") { e.preventDefault(); close.current(); }
      if (e.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0] ?? element;
      const last = controls[controls.length - 1] ?? element;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === element)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openDialogs.splice(openDialogs.indexOf(element), 1);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "overlay-in .15s ease-out" }}
    >
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${width} rounded-2xl bg-card shadow-2xl border border-line ${scrollable ? "flex max-h-full flex-col" : ""}`}
        style={{ animation: "modal-in .2s ease-out" }}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b border-line ${scrollable ? "shrink-0" : ""}`}>
          <h3 id={titleId} className="text-base font-semibold text-ink-900">{title}</h3>
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
          <div className={`flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-line bg-slate-50/50 rounded-b-2xl ${scrollable ? "shrink-0" : ""}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

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

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .trim().split(/\s+/)
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

export function Menu({ trigger, children, label = "Open actions" }: { trigger: ReactNode; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" ref={triggerRef} aria-label={label} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && (
        <div
          id={id}
          className="absolute right-0 top-full z-40 mt-2 min-w-[200px] rounded-xl border border-line bg-white p-1.5 shadow-xl animate-in"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
