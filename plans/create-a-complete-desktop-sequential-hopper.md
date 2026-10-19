# AutoServe — Automotive Service & Repair Management Platform

## Context

The project is a bare Vite + React 19 + Tailwind v4 scaffold (`src/App.tsx` is empty). The user wants a complete, production-looking desktop web app called **AutoServe** covering ~30 screens across three roles (Customer, Technician, Admin/Manager), designed for a 1512×982 desktop. The attached reference image defines the visual language: dark navy left sidebar, white cards on a light gray page, blue primary buttons, green/yellow/red status badges, Inter font, rounded cards with subtle borders/shadows, and clean tables/forms/charts/timelines.

Decisions confirmed with the user:
- **Navigation:** real URL routing via **react-router** (deep-linkable routes).
- **Interactivity:** **fully functional prototype** — routing, tabs, filters, forms, modals, and role switching all work against in-memory mock data.

Outcome: one cohesive application (not disconnected mockups) that improves on the reference's spacing, hierarchy, alignment, and usability.

## Aesthetic

Honor the brief literally (professional automotive SaaS — ignore the exploratory memphis/warm/maximalist suggestions).
- **Fonts:** Inter for UI/body; JetBrains Mono for tabular data/IDs/labels (VINs, request IDs, amounts). Both via Google Fonts `@import` at the very top of `src/index.css`.
- **Palette (design tokens in `src/index.css` `@theme`):** navy sidebar `#0f172a`/`#111c34`, page `#f5f7fa`, cards white, border `#e5e9f0`, primary blue `#2563eb`, success green, warning amber, danger red, muted slate text.
- **Craft:** rounded-xl cards, hairline borders + subtle shadow, generous but compact spacing, hover/focus states, statistic cards, timelines, status badges, `recharts` for charts. Fixed 1512-optimized layout that stays usable; add a ~1024px breakpoint so grids collapse gracefully.

## Dependencies to add

- `react-router-dom` — routing
- `recharts` — admin/dashboard charts
- `lucide-react` — icon set for sidebar/nav/actions

## Architecture

```
src/
  main.tsx                 # wrap <App/> in <BrowserRouter> (edit)
  App.tsx                  # <Routes> tree + role-based layout (rewrite)
  index.css                # fonts + theme tokens + base (edit)
  data/mock.ts             # vehicles, requests, appointments, jobs, parts, invoices, users, notifications
  store/AppContext.tsx     # in-memory state (current role/user, mutable collections) + actions
  components/
    layout/Sidebar.tsx     # role-aware nav (config-driven per role)
    layout/Topbar.tsx      # page title, search, notifications bell, role switcher, profile
    layout/AppShell.tsx    # grid: sidebar + topbar + <Outlet/>
    ui/Button.tsx  Input.tsx  Select.tsx  Textarea.tsx
    ui/Card.tsx  StatCard.tsx  Table.tsx  StatusBadge.tsx
    ui/Modal.tsx  Tabs.tsx  Timeline.tsx  EmptyState.tsx  Avatar.tsx
    ui/PageHeader.tsx (breadcrumbs + title + actions)
  pages/
    auth/{Login,SignUp,ForgotPassword}.tsx
    customer/{Dashboard,MyVehicles,VehicleForm,CreateServiceRequest,
              Appointments,CheckIn,Approval,RepairStatus,Invoice,
              ServiceHistory,Notifications,Profile}.tsx
    technician/{Dashboard,AssignedJobs,WorkOrder,Parts,TimeLog,Notifications,Profile}.tsx
    admin/{Dashboard,ServiceRequests,Appointments,Users,Technicians,
           Reports,Inventory,Settings}.tsx
```

### Routing
- `/login`, `/signup`, `/forgot-password` — auth screens (split layout with car hero image, per reference #1).
- `/customer/*`, `/technician/*`, `/admin/*` — each wrapped in `AppShell` with its role's sidebar config.
- Role switcher in the topbar (and login role selection) navigates between role trees — satisfies the "three roles" requirement without auth backend.
- `/` redirects to `/customer/dashboard`.

### Reusable components (built once, used everywhere)
Sidebar, Topbar, Button (primary/secondary/danger/ghost), Input/Select/Textarea, Card, StatCard, Table (sortable-ready, status column), StatusBadge (green/yellow/red/blue variants keyed to statuses like In Repair, Awaiting Approval, Completed, Diagnosed, Scheduled, Paid), Modal, Tabs, Timeline (repair status), Notifications list, PageHeader/breadcrumbs. All driven by props + tokens for a consistent system.

### State & interactivity (fully functional)
`AppContext` holds mutable arrays for vehicles, service requests, appointments, jobs, parts inventory, invoices, users, notifications. Wired actions:
- Add/edit/delete vehicle; create service request (dropdown of user's vehicles); book/reschedule/cancel appointment (Upcoming/Past tabs).
- Check-in form (condition selects, photo tiles, notes) updates request state → drives the repair timeline.
- Technician work order: enter diagnosis, add recommended repairs (line items with cost), submit for approval.
- Customer approval screen: Approve All / Approve Selected / Reject / Request More Info → advances status and generates invoice.
- Repair status timeline reflects current stage (Requested → Checked In → Diagnosed → Awaiting Approval → In Repair → Completed).
- Admin: add/edit users & technicians, parts inventory CRUD, service-request/appointment tables with filters, reports with recharts (bar: service requests; line: revenue), settings form.
- Notifications bell shows unread count; "Mark all as read".

### Data
Realistic automotive content: Toyota Camry 2018, Honda Accord 2020, Hyundai Elantra 2019; VINs, mileage, request IDs (SR10021+), invoices (INV10023), parts (Brake Pads BP-1001, Oil Filter OF-2002...), technicians (Mike), customers (John Doe). Vehicle images via Unsplash car photos with bg fallback + alt text.

## Files to modify
- `src/main.tsx` — add `BrowserRouter`.
- `src/App.tsx` — full route tree + provider.
- `src/index.css` — Google Fonts `@import` (first lines), `@theme` tokens, base styles, hidden scrollbars.
- Everything under `src/{data,store,components,pages}` — new.

## Verification
1. `pnpm install` new deps (react-router-dom, recharts, lucide-react).
2. Dev server already runs on `$PORT`; load preview and walk each role tree via the role switcher.
3. Exercise flows end-to-end: add a vehicle → create service request → check-in → technician diagnosis/recommend → customer approve → repair status timeline advances → invoice generated → appears in service history.
4. Confirm admin charts render (recharts), tables filter, and modals open/close.
5. Check ~1024px breakpoint collapses grids without breaking the sidebar.
6. `pnpm build` to confirm the production build passes (routing + imports resolve).
```
```
