import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useLogicalPath, useNavigate } from "../router";
import { useApp } from "../store/AppContext";
import { Avatar, Button, Menu } from "./ui";
import {
  IconGauge,
  IconCar,
  IconClipboard,
  IconCalendar,
  IconHistory,
  IconInvoice,
  IconBell,
  IconUser,
  IconUsers,
  IconLogout,
  IconWrench,
  IconBox,
  IconClock,
  IconChart,
  IconSettings,
  IconSearch,
  IconMenu,
  IconX,
} from "./icons";
import type { Role } from "../data/mock";

/** `feature` groups equivalent pages across roles so multi-role users see one entry. */
type NavItem = { label: string; to: string; icon: ReactNode; feature?: string };

const navByRole: Record<Role, NavItem[]> = {
  customer: [
    { label: "Dashboard", to: "/customer/dashboard", icon: <IconGauge /> },
    { label: "My Vehicles", to: "/customer/vehicles", icon: <IconCar /> },
    { label: "Service Requests", to: "/customer/requests", icon: <IconClipboard /> },
    { label: "Appointments", to: "/customer/appointments", icon: <IconCalendar /> },
    { label: "Service History", to: "/customer/history", icon: <IconHistory /> },
    { label: "Invoices", to: "/customer/invoices", icon: <IconInvoice /> },
    { label: "Profile", to: "/customer/profile", icon: <IconUser /> },
  ],
  technician: [
    { label: "Dashboard", to: "/technician/dashboard", icon: <IconGauge /> },
    { label: "My Jobs", to: "/technician/jobs", icon: <IconClipboard /> },
    { label: "Work Orders", to: "/technician/work-orders", icon: <IconWrench /> },
    { label: "Parts", to: "/technician/parts", icon: <IconBox />, feature: "parts" },
    { label: "Time Logs", to: "/technician/time-log", icon: <IconClock /> },
    { label: "Profile", to: "/technician/profile", icon: <IconUser /> },
  ],
  admin: [
    { label: "Work Orders", to: "/admin/work-orders", icon: <IconWrench /> },
    { label: "Dashboard", to: "/admin/dashboard", icon: <IconGauge /> },
    { label: "Service Requests", to: "/admin/requests", icon: <IconClipboard /> },
    { label: "Appointments", to: "/admin/appointments", icon: <IconCalendar /> },
    { label: "Users", to: "/admin/users", icon: <IconUsers /> },
    { label: "Technicians", to: "/admin/technicians", icon: <IconWrench /> },
    { label: "Reports", to: "/admin/reports", icon: <IconChart /> },
    { label: "Time Logs", to: "/admin/time-log", icon: <IconClock /> },
    { label: "Inventory", to: "/admin/inventory", icon: <IconBox />, feature: "parts" },
    { label: "Settings", to: "/admin/settings", icon: <IconSettings /> },
    { label: "Profile", to: "/admin/profile", icon: <IconUser /> },
  ],
};

const roleUser: Record<Role, { name: string; sub: string; roles: Role[] }> = {
  customer: { name: "John Doe", sub: "Customer", roles: ["customer"] },
  technician: { name: "Mike Johnson", sub: "Technician", roles: ["technician"] },
  admin: { name: "Sarah Williams", sub: "Service Manager", roles: ["admin"] },
};

const roleMeta: Record<Role, { label: string; icon: ReactNode }> = {
  customer: { label: "Customer", icon: <IconUser size={16} /> },
  technician: { label: "Technician", icon: <IconWrench size={16} /> },
  admin: { label: "Admin / Manager", icon: <IconUsers size={16} /> },
};

/**
 * Merge the menus of every assigned role into one list. Items that resolve to the
 * same URL (Dashboard, Profile, ...) appear once, taking the higher-privilege role's
 * entry. Profile is always kept last.
 */
function unifiedNav(roles: Role[]): NavItem[] {
  const seen = new Set<string>();
  const out: NavItem[] = [];
  for (const r of ["admin", "technician", "customer"] as Role[]) {
    if (!roles.includes(r)) continue;
    for (const it of navByRole[r]) {
      const key = it.feature ?? it.to.split("/").slice(2).join("/");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
  }
  return [...out.filter((i) => i.label !== "Profile"), ...out.filter((i) => i.label === "Profile")];
}

function Sidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const { signOut, availableRoles } = useApp();
  const navigate = useNavigate();
  const { pathname: urlPath } = useLocation();
  const urlRest = urlPath.split("/").slice(2).join("/");
  const items = unifiedNav(availableRoles.length ? availableRoles : [role]);
  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col bg-navy-800 text-slate-300">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
          <IconWrench size={19} />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">AutoServe</span>
        {onNavigate && (
          <button
            onClick={onNavigate}
            aria-label="Close menu"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-navy-600 hover:text-white lg:hidden"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {["Overview", "Operations", "Management", "Account"].map((group) => {
          const groupFor = (label: string) => label === "Dashboard" ? "Overview" : ["Settings", "Profile"].includes(label) ? "Account" : ["Technicians", "Users", "Inventory", "Reports", "Parts"].includes(label) ? "Management" : "Operations";
          const order = ["Dashboard", "Service Requests", "Work Orders", "Appointments", "Time Logs", "My Jobs", "My Vehicles", "Service History", "Invoices", "Technicians", "Users", "Inventory", "Parts", "Reports", "Settings", "Profile"];
          const entries = items.filter((it) => groupFor(it.label) === group).sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
          if (!entries.length && group !== "Account") return null;
          return <div key={group} className="space-y-1 pb-3">
            <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{group}</div>
            {entries.map((it) => {
          const rest = it.to.split("/").slice(2).join("/");
          const active = urlRest === rest || urlRest.startsWith(rest + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                active
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-slate-300 hover:bg-navy-600 hover:text-white"
              }`}
            >
              <span className={active ? "text-white" : "text-slate-400"}>{it.icon}</span>
              {it.label}
            </Link>
          );
            })}
            {group === "Account" && <Button variant="ghost" onClick={() => { signOut(); navigate("/login"); }} className="w-full justify-start text-slate-300 hover:bg-navy-600 hover:text-white"><IconLogout /> Logout</Button>}
          </div>;
        })}
      </nav>

    </aside>
  );
}

function Topbar({ role, title, onMenu }: { role: Role; title: string; onMenu: () => void }) {
  const { unreadCount, markAllRead, notifications, userName, availableRoles } = useApp();
  const fallback = roleUser[role];
  const name = userName ?? fallback.name;
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-500 hover:bg-slate-50 lg:hidden"
        >
          <IconMenu size={18} />
        </button>
        <h2 className="truncate text-[15px] font-semibold text-ink-900 sm:text-[17px]">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden lg:block">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            placeholder="Search..."
            className="h-9 w-56 rounded-lg border border-line bg-slate-50 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>

        <Menu
          trigger={
            <span className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-500 hover:bg-slate-50">
              <IconBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </span>
          }
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold text-ink-900">Notifications</span>
            <button onClick={markAllRead} className="text-[12px] font-medium text-brand-600 hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-line" : "bg-brand-500"}`} />
                <div>
                  <p className="text-[13px] leading-snug text-ink-700">{n.text}</p>
                  <p className="text-[11px] text-ink-400">{n.at}</p>
                </div>
              </div>
            ))}
          </div>
        </Menu>

        {/* Display-only profile; Profile, Logout and role switching live in the sidebar. */}
          <span className="flex items-center gap-2 rounded-lg border border-line bg-white py-1 pl-1 pr-2.5">
              <Avatar name={name} size={30} />
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-semibold leading-tight text-ink-900">{name}</span>
                <span className="block text-[11px] leading-tight text-ink-400">{(availableRoles.length ? availableRoles.map((r) => roleUser[r].sub).join(" + ") : fallback.sub)}</span>
              </span>
            </span>
      </div>
    </header>
  );
}

export function AppShell({
  role,
  title,
  children,
}: {
  role: Role;
  title: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useLogicalPath();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar role={role} />
      </div>

      {/* Mobile slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-900/50 backdrop-blur-[2px]"
            style={{ animation: "overlay-in .15s ease-out" }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full" style={{ animation: "drawer-in .22s ease-out" }}>
            <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} title={title} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1180px] animate-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
