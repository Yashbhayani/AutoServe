import { Fragment, useEffect, type ReactNode } from "react";
import { RouteRoleProvider, matchPath, slugify, toLogical, useLocation, useNavigate } from "./router";
import { useApp } from "./store/AppContext";
import { AppShell } from "./components/AppShell";
import { ForgotPasswordPage, LoginPage, SignUpPage } from "./pages/auth";
import {
  CreateServiceRequest,
  CustomerApproval,
  CustomerAppointments,
  CustomerCheckIn,
  CustomerDashboard,
  CustomerInvoices,
  CustomerRequests,
  InvoiceDetail,
  MyVehicles,
  NotificationsPage,
  ProfilePage,
  RepairStatus,
  ServiceHistory,
  VehicleForm,
} from "./pages/customer";
import {
  AssignedJobs,
  TechDashboard,
  TechParts,
  TimeLog,
  WorkOrderDetail,
  WorkOrders,
} from "./pages/technician";
import {
  AdminAppointments,
  AdminDashboard,
  AdminRequests,
  Inventory,
  Reports,
  Settings,
  TechnicianManagement,
  UserManagement,
} from "./pages/admin";
import type { Role } from "./data/mock";

type Route = { pattern: string; title: string; el: ReactNode };

const customerRoutes: Route[] = [
  { pattern: "/customer/dashboard", title: "Dashboard", el: <CustomerDashboard /> },
  { pattern: "/customer/vehicles", title: "My Vehicles", el: <MyVehicles /> },
  { pattern: "/customer/vehicles/:id", title: "Vehicle", el: <VehicleForm /> },
  { pattern: "/customer/requests", title: "Service Requests", el: <CustomerRequests /> },
  { pattern: "/customer/requests/new", title: "New Request", el: <CreateServiceRequest /> },
  { pattern: "/customer/appointments", title: "Appointments", el: <CustomerAppointments /> },
  { pattern: "/customer/check-in/:id", title: "Check-In", el: <CustomerCheckIn /> },
  { pattern: "/customer/approval/:id", title: "Approval", el: <CustomerApproval /> },
  { pattern: "/customer/repair-status/:id", title: "Repair Status", el: <RepairStatus /> },
  { pattern: "/customer/invoices", title: "Invoices", el: <CustomerInvoices /> },
  { pattern: "/customer/invoice/:id", title: "Invoice", el: <InvoiceDetail /> },
  { pattern: "/customer/history", title: "Service History", el: <ServiceHistory /> },
  { pattern: "/customer/notifications", title: "Notifications", el: <NotificationsPage /> },
  { pattern: "/customer/profile", title: "Profile", el: <ProfilePage /> },
];

const technicianRoutes: Route[] = [
  { pattern: "/technician/dashboard", title: "Dashboard", el: <TechDashboard /> },
  { pattern: "/technician/jobs", title: "My Jobs", el: <AssignedJobs /> },
  { pattern: "/technician/work-orders", title: "Work Orders", el: <WorkOrders /> },
  { pattern: "/technician/work-orders/:id", title: "Work Order", el: <WorkOrderDetail /> },
  { pattern: "/technician/parts", title: "Parts", el: <TechParts /> },
  { pattern: "/technician/time-log", title: "Time Log", el: <TimeLog /> },
  { pattern: "/technician/notifications", title: "Notifications", el: <NotificationsPage /> },
  { pattern: "/technician/profile", title: "Profile", el: <ProfilePage /> },
];

const adminRoutes: Route[] = [
  { pattern: "/admin/work-orders", title: "Work Orders", el: <WorkOrders /> },
  { pattern: "/admin/work-orders/:id", title: "Work Order", el: <WorkOrderDetail /> },
  { pattern: "/admin/dashboard", title: "Dashboard", el: <AdminDashboard /> },
  { pattern: "/admin/requests", title: "Service Requests", el: <AdminRequests /> },
  { pattern: "/admin/appointments", title: "Appointments", el: <AdminAppointments /> },
  { pattern: "/admin/users", title: "User Management", el: <UserManagement /> },
  { pattern: "/admin/technicians", title: "Technicians", el: <TechnicianManagement /> },
  { pattern: "/admin/reports", title: "Reports", el: <Reports /> },
  { pattern: "/admin/time-log", title: "Time Logs", el: <TimeLog /> },
  { pattern: "/admin/inventory", title: "Inventory", el: <Inventory /> },
  { pattern: "/admin/settings", title: "Settings", el: <Settings /> },
  { pattern: "/admin/profile", title: "Profile", el: <ProfilePage /> },
];

const routesByRole: Record<Role, Route[]> = {
  admin: adminRoutes,
  technician: technicianRoutes,
  customer: customerRoutes,
};
/** Highest privilege first: when two roles share a URL (dashboard, profile...), the higher one wins. */
export const ROLE_PRIORITY: Role[] = ["admin", "technician", "customer"];

/** Find the route for a slug URL across ALL of the user's roles (merged access). */
function resolveRoute(pathname: string, roles: Role[]) {
  for (const r of ROLE_PRIORITY) {
    if (!roles.includes(r)) continue;
    const logical = toLogical(pathname, r);
    const ordered = [...routesByRole[r]].sort((a, b) => b.pattern.length - a.pattern.length);
    const match = ordered.find((rt) => matchPath(rt.pattern, logical));
    if (match) return { role: r, match };
  }
  return null;
}

export default function App() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { role, userName, availableRoles } = useApp();

  const authed = !!userName;
  const slug = userName ? slugify(userName) : null;
  const isAuthRoute =
    pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";
  const urlSlug = pathname.split("/")[1];

  // The role is taken from the authenticated session, NOT the URL — so a URL can't
  // grant access to a role the signed-in user doesn't have.
  let redirectTo: string | null = null;
  if (pathname === "/") redirectTo = authed ? `/${slug}/dashboard` : "/login";
  else if (!authed && !isAuthRoute) redirectTo = "/login";
  else if (authed && !isAuthRoute && urlSlug !== slug) redirectTo = "/login"; // URL/user mismatch

  useEffect(() => {
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate]);

  // Auth screens (no shell)
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/signup") return <SignUpPage />;
  if (pathname === "/forgot-password") return <ForgotPasswordPage />;
  if (redirectTo || !authed) return null;

  const roles: Role[] = availableRoles.length ? availableRoles : [role];
  const resolved = resolveRoute(pathname, roles);
  const match = resolved?.match;
  const activeRole: Role = resolved?.role ?? role;

  if (!match) {
    return (
      <AppShell role={activeRole} title="Not Found">
        <div className="grid place-items-center py-24 text-center">
          <p className="text-5xl font-bold text-ink-900">404</p>
          <p className="mt-2 text-ink-500">This page could not be found.</p>
          <button
            onClick={() => navigate(`/${activeRole}/dashboard`)}
            className="mt-5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Back to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <RouteRoleProvider value={activeRole}>
      <AppShell role={activeRole} title={match.title}>
        {/* Re-mount for a new record or drill-down filter, avoiding stale form data. */}
        <Fragment key={`${pathname}${search}`}>{match.el}</Fragment>
      </AppShell>
    </RouteRoleProvider>
  );
}
