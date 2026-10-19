import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  appointments as seedAppointments,
  invoices as seedInvoices,
  notifications as seedNotifications,
  parts as seedParts,
  serviceRequests as seedRequests,
  technicians as seedTechnicians,
  specialties as seedSpecialties,
  users as seedUsers,
  vehicles as seedVehicles,
  timeLogs as seedTimeLogs,
  partRequests as seedPartRequests,
  LABOR_RATE,
  type PartRequest,
  type TimelineEntry,
  assignments as seedAssignments,
  accounts,
  type ServiceAssignment,
  STAGES,
  type Appointment,
  type AppNotification,
  type AppUser,
  type Invoice,
  type Part,
  type RepairLine,
  type ServiceRequest,
  type Role,
  type Technician,
  type TimeLogEntry,
  type Vehicle,
} from "../data/mock";

function nowStamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ActionResult = { ok: boolean; error?: string };

type Ctx = {
  accountId: string | null;
  ownsVehicle: (id: string) => boolean;
  eligibleRequests: ServiceRequest[];
  holdAssignment: (id: string, reason: string) => ActionResult;
  resumeAssignment: (id: string, reason: string) => ActionResult;
  /** Primary role (highest privilege) — used for default landing/labels only. */
  role: Role;
  /** True if ANY assigned role grants access. Permissions are the union of all roles. */
  hasRole: (r: Role) => boolean;
  isAdmin: boolean;
  userName: string | null;
  availableRoles: Role[];
  signIn: (name: string, roles: Role[], accountId?: string) => Role;
  signOut: () => void;
  vehicles: Vehicle[];
  requests: ServiceRequest[];
  appointments: Appointment[];
  parts: Part[];
  invoices: Invoice[];
  users: AppUser[];
  technicians: Technician[];
  specialties: string[];
  notifications: AppNotification[];
  timeLogs: TimeLogEntry[];
  assignments: ServiceAssignment[];

  addVehicle: (v: Omit<Vehicle, "id" | "customerId">) => ActionResult;
  updateVehicle: (v: Vehicle) => ActionResult;
  removeVehicle: (id: string) => ActionResult;

  createRequest: (r: {
    vehicleId: string;
    services: string[];
    description: string;
    preferredDate: string;
    preferredTime: string;
  }) => string;
  checkIn: (id: string, data: Partial<ServiceRequest>) => ActionResult;
  /** Technician: save diagnosis + estimate lines (prices always come from inventory / labor rate). */
  saveEstimate: (id: string, diagnosis: string, repairs: RepairLine[], opts?: { submit?: boolean; note?: string }) => ActionResult;
  /** Technician: Diagnosed -> Pending Admin Review. */
  submitEstimate: (id: string, note?: string) => ActionResult;
  /** Admin: send for customer approval, or return for revision. */
  reviewEstimate: (id: string, decision: "send" | "reject" | "revise", note?: string) => ActionResult;
  /** Customer approves; or Admin records consent when `method` is given. */
  approveRepairs: (id: string, repairIds: string[], opts?: { method?: string; note?: string }) => ActionResult;
  rejectRepairs: (id: string, opts?: { method?: string; note?: string }) => ActionResult;
  completeRepair: (id: string, note?: string) => ActionResult;

  /** Technician record for the signed-in user (if they hold the technician role). */
  myTechId: string | null;
  laborRate: number;
  setLaborRate: (n: number) => void;
  partRequests: PartRequest[];
  requestPart: (requestId: string, partId: string, qty: number, note: string) => ActionResult;
  resolvePartRequest: (id: string, approve: boolean) => void;
  addTimeLog: (e: Omit<TimeLogEntry, "id" | "technicianId">) => ActionResult;
  removeTimeLog: (id: string) => void;

  addAppointment: (a: Omit<Appointment, "id" | "status">) => ActionResult;
  rescheduleAppointment: (id: string, date: string, time: string) => ActionResult;
  cancelAppointment: (id: string) => ActionResult;

  addPart: (p: Omit<Part, "id">) => void;
  updatePart: (p: Part) => void;
  removePart: (id: string) => void;

  addUser: (u: Omit<AppUser, "id">) => void;
  updateUser: (u: AppUser) => void;
  removeUser: (id: string) => void;

  addTechnician: (t: { name: string; email: string; phone: string; status: Technician["status"]; specialties: string[] }) => void;
  setTechnicianSpecialties: (id: string, list: string[]) => void;
  updateTechnician: (t: Technician) => void;
  addSpecialty: (name: string) => void;
  renameSpecialty: (from: string, to: string) => void;
  removeSpecialty: (name: string) => void;
  addAssignment: (a: Omit<ServiceAssignment, "id" | "assignedAt">) => ActionResult;
  updateAssignment: (a: ServiceAssignment) => ActionResult;
  removeAssignment: (id: string) => ActionResult;

  markAllRead: () => void;
  unreadCount: number;
};

const AppCtx = createContext<Ctx | null>(null);

const uid = (p: string) => `${p}-${crypto.randomUUID()}`;
const SNAPSHOT_KEY = "as_shop_v2";
const collections = ["vehicles", "requests", "appointments", "parts", "invoices", "users", "technicians", "specialties", "assignments", "notifications", "timeLogs", "partRequests"] as const;
function restore() {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== 2 || !Number.isFinite(data.laborRate) || !Array.isArray(data.accounts) || !data.accounts.every((a: any) => typeof a.id === "string" && typeof a.name === "string" && typeof a.email === "string" && typeof a.phone === "string" && Array.isArray(a.roles) && a.roles.every((r: string) => ["customer", "technician", "admin"].includes(r)))) return null;
    for (const key of collections) {
      if (!Array.isArray(data[key]) || !data[key].every((x: any) => key === "specialties" ? typeof x === "string" : x && typeof x.id === "string")) return null;
      if (key !== "specialties" && new Set(data[key].map((x: any) => x.id)).size !== data[key].length) return null;
    }
    const strings = (x: any, keys: string[]) => keys.every((k) => typeof x[k] === "string");
    const numbers = (x: any, keys: string[]) => keys.every((k) => Number.isFinite(x[k]) && x[k] >= 0);
    const shapes: Record<string, (x: any) => boolean> = {
      vehicles: (v) => strings(v, ["make", "model", "vin", "plate", "color", "image", "customerId"]) && numbers(v, ["year", "mileage"]),
      requests: (r) => strings(r, ["vehicleId", "serviceType", "description", "createdAt", "preferredDate", "preferredTime"]) && numbers(r, ["total"]) && Array.isArray(r.repairs) && r.repairs.every((l: any) => strings(l, ["id", "item"]) && ["Part", "Labor"].includes(l.type) && numbers(l, ["cost"]) && (l.approved == null || typeof l.approved === "boolean")) && Array.isArray(r.timeline) && r.timeline.every((t: any) => strings(t, ["at", "label"]) && ["info", "warn", "ok"].includes(t.kind)),
      appointments: (a) => strings(a, ["vehicleId", "serviceType", "date", "time"]) && ["Scheduled", "Completed", "Cancelled"].includes(a.status),
      parts: (p) => strings(p, ["name", "number", "category"]) && numbers(p, ["quantity", "price"]),
      invoices: (i) => strings(i, ["requestId", "vehicleId", "date"]) && numbers(i, ["taxRate"]) && ["Paid", "Unpaid", "Overdue"].includes(i.status),
      users: (u) => strings(u, ["name", "email", "phone"]) && ["Customer", "Technician", "Service Manager", "Admin"].includes(u.role) && ["Active", "Invited", "Suspended"].includes(u.status),
      technicians: (t) => strings(t, ["name", "email"]) && numbers(t, ["activeJobs", "completed", "rating"]) && ["Available", "Busy", "Off"].includes(t.status) && Array.isArray(t.specialties) && t.specialties.every((s: any) => typeof s === "string"),
      assignments: (a) => strings(a, ["requestId", "technicianId", "assignedAt", "notes"]) && (a.resumeStatus == null || ["Assigned", "In Progress"].includes(a.resumeStatus)) && (a.holdReason == null || typeof a.holdReason === "string"),
      notifications: (n) => strings(n, ["text", "at"]) && typeof n.read === "boolean" && ["ok", "info", "warn", "bell"].includes(n.kind) && (n.roles == null || (Array.isArray(n.roles) && n.roles.every((r: any) => ["admin", "technician", "customer"].includes(r)))),
      timeLogs: (t) => strings(t, ["requestId", "technicianId", "vehicle", "task", "date"]) && numbers(t, ["hours"]),
      partRequests: (p) => strings(p, ["requestId", "technicianId", "partId", "at", "note"]) && numbers(p, ["qty"]) && ["Pending", "Issued", "Rejected"].includes(p.status),
    };
    if (Object.entries(shapes).some(([key, valid]) => !data[key].every(valid))) return null;
    if (!data.requests.every((r: any) => r.services === undefined || (Array.isArray(r.services) && r.services.length > 0 && r.services.every((s: any) => typeof s === "string" && s.trim().length > 0)))) return null;
    if (!data.appointments.every((a: any) => a.services === undefined || (Array.isArray(a.services) && a.services.length > 0 && a.services.every((s: any) => typeof s === "string" && s.trim().length > 0)))) return null;
    if (new Set(data.accounts.map((a: any) => a.id)).size !== data.accounts.length || data.laborRate < 0) return null;
    if (!data.vehicles.every((v: any) => typeof v.customerId === "string" && data.accounts.some((a: any) => a.id === v.customerId))) return null;
    if (!data.requests.every((r: any) => data.vehicles.some((v: any) => v.id === r.vehicleId) && STAGES.includes(r.stage) && Array.isArray(r.repairs) && Array.isArray(r.timeline))) return null;
    if (!data.requests.every((r: ServiceRequest) => validLines(r.repairs, data.parts, data.laborRate) && (!r.technicianId || data.technicians.some((t: Technician) => t.id === r.technicianId)))) return null;
    if (!data.assignments.every((a: any) => data.requests.some((r: any) => r.id === a.requestId && r.technicianId === a.technicianId) && data.technicians.some((t: any) => t.id === a.technicianId) && ["Assigned", "In Progress", "On Hold", "Completed"].includes(a.status)) || new Set(data.assignments.map((a: any) => a.requestId)).size !== data.assignments.length) return null;
    if (!data.invoices.every((i: any) => data.requests.some((r: any) => r.id === i.requestId && r.vehicleId === i.vehicleId)) || !data.appointments.every((a: any) => data.vehicles.some((v: any) => v.id === a.vehicleId) && (!a.requestId || data.requests.some((r: any) => r.id === a.requestId && r.vehicleId === a.vehicleId)))) return null;
    if (!data.timeLogs.every((t: any) => data.requests.some((r: any) => r.id === t.requestId) && data.technicians.some((x: any) => x.id === t.technicianId)) || !data.partRequests.every((p: any) => data.requests.some((r: any) => r.id === p.requestId) && data.parts.some((x: any) => x.id === p.partId) && data.technicians.some((x: any) => x.id === p.technicianId))) return null;
    accounts.splice(0, accounts.length, ...data.accounts);
    return data;
  } catch { return null; }
}
function storedAccount() {
  try {
    const id = sessionStorage.getItem("as_account");
    return id ? accounts.find((a) => a.id === id) : accounts.find((a) => a.name === sessionStorage.getItem("as_user"));
  } catch { return undefined; }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [snapshot] = useState(restore);
  const [persistenceWarning, setPersistenceWarning] = useState(false);
  const [signedInId, setSignedInId] = useState<string | null>(() => storedAccount()?.id ?? null);
  const [userName, setUserName] = useState<string | null>(() => storedAccount()?.name ?? null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>(() => storedAccount()?.roles ?? []);
  useEffect(() => {
    try {
      if (userName) {
        sessionStorage.setItem("as_user", userName);
        sessionStorage.setItem("as_roles", JSON.stringify(availableRoles));
        if (signedInId) sessionStorage.setItem("as_account", signedInId);
      } else {
        sessionStorage.removeItem("as_user"); sessionStorage.removeItem("as_roles"); sessionStorage.removeItem("as_account");
      }
    } catch { setPersistenceWarning(true); }
  }, [userName, availableRoles, signedInId]);
  const role: Role = (["admin", "technician", "customer"] as Role[]).find((r) => availableRoles.includes(r)) ?? "customer";
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => snapshot?.vehicles ?? seedVehicles);
  // Totals are always derived from estimate lines so every screen agrees.
  const [requests, setRequests] = useState<ServiceRequest[]>(() =>
    snapshot?.requests ?? seedRequests.map((r) => (r.repairs.length ? { ...r, total: sumLines(r.repairs.filter((l) => r.stage === "In Repair" || r.stage === "Completed" ? l.approved !== false : true)) } : r)),
  );
  const [appointments, setAppointments] = useState<Appointment[]>(() => snapshot?.appointments ?? seedAppointments);
  const [parts, setParts] = useState<Part[]>(() => snapshot?.parts ?? seedParts);
  const [invoices, setInvoices] = useState<Invoice[]>(() => snapshot?.invoices ?? seedInvoices);
  const [users, setUsers] = useState<AppUser[]>(() => snapshot?.users ?? seedUsers);
  const [technicians, setTechnicians] = useState<Technician[]>(() => snapshot?.technicians ?? seedTechnicians);
  const [specialties, setSpecialties] = useState<string[]>(() => snapshot?.specialties ?? seedSpecialties);
  const [assignments, setAssignments] = useState<ServiceAssignment[]>(() => snapshot?.assignments ?? seedAssignments);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => snapshot?.notifications ?? seedNotifications);
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>(() => snapshot?.timeLogs ?? seedTimeLogs);
  const [partRequests, setPartRequests] = useState<PartRequest[]>(() => snapshot?.partRequests ?? seedPartRequests);
  const [laborRate, setLaborRateState] = useState<number>(() => snapshot?.laborRate ?? LABOR_RATE);

  useEffect(() => {
    try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: 2, vehicles, requests, appointments, parts, invoices, users, technicians, specialties, assignments, notifications, timeLogs, partRequests, laborRate, accounts })); }
    catch { setPersistenceWarning(true); }
  }, [vehicles, requests, appointments, parts, invoices, users, technicians, specialties, assignments, notifications, timeLogs, partRequests, laborRate, userName]);
  // Serialize job transitions until React commits their related collection updates.
  const pending = useRef(new Set<string>());
  useEffect(() => { pending.current.clear(); });
  const live = useRef({ requests, assignments });
  live.current = { requests, assignments };
  const lock = (id: string) => { if (pending.current.has(id)) return false; pending.current.add(id); return true; };
  const can = { admin: availableRoles.includes("admin"), tech: availableRoles.includes("technician"), customer: availableRoles.includes("customer") };
  const account = accounts.find((a) => a.id === signedInId);
  const accountId = account?.id ?? null;
  const ownsVehicle = (id: string) => !!accountId && vehicles.some((v) => v.id === id && v.customerId === accountId);
  const ownsRequest = (r: ServiceRequest) => ownsVehicle(r.vehicleId);
  const held = (id: string) => live.current.assignments.some((a) => a.requestId === id && a.status === "On Hold");
  const eligibleRequests = requests.filter((r) => r.stage !== "Completed" && !r.technicianId && !assignments.some((a) => a.requestId === r.id));
  const visibleNote = (n: AppNotification) => (!!accountId && n.accountId === accountId) || !!n.roles?.some((r) => availableRoles.includes(r));
  const myTechId = can.tech ? technicians.find((t) => t.email.toLowerCase() === account?.email.toLowerCase() || t.name === userName)?.id ?? null : null;
  const isMyJob = (r: ServiceRequest) => can.tech && !!myTechId && r.technicianId === myTechId;
  const actorRole = () => (can.admin ? "Admin" : can.tech ? "Technician" : "Customer");
  function deny(msg = "You don't have permission to perform this action.") {
    pushNote(msg, "warn");
    return { ok: false, error: msg };
  }
  function priceLines(lines: RepairLine[]) {
    return lines.map((l) => ({ ...l, cost: lineCost(l, parts, laborRate) }));
  }

  function pushNote(text: string, kind: AppNotification["kind"] = "info", audience: Partial<AppNotification> = { accountId: accountId ?? undefined }) {
    setNotifications((n) => [
      { ...audience, id: uid("n"), kind, text, at: nowStamp(), read: false },
      ...n,
    ]);
  }

  /** Append an attributed entry to the request's status/activity history. */
  function log(r: ServiceRequest, label: string, kind: TimelineEntry["kind"], extra: Partial<TimelineEntry> = {}, roleLabel?: string) {
    const entry: TimelineEntry = { at: nowStamp(), label, kind, by: userName ?? "System", role: roleLabel ?? actorRole(), ...extra };
    if (!entry.note) delete entry.note;
    return { ...r, timeline: [...r.timeline, entry] };
  }

  function changeHold(id: string, reason: string, resume: boolean): ActionResult {
    const a = live.current.assignments.find((x) => x.id === id);
    const r = a && live.current.requests.find((x) => x.id === a.requestId);
    if (!a || !r || !(can.admin || (isMyJob(r) && a.technicianId === myTechId))) return deny();
    if (!reason.trim()) return deny("A reason is required.");
    if (r.stage === "Completed" || (resume ? a.status !== "On Hold" : !["Assigned", "In Progress"].includes(a.status))) return deny("The assignment status has changed.");
    if (!lock(r.id)) return deny("This job is already being updated.");
    setAssignments((s) => s.map((x) => x.id === id ? resume ? { ...x, status: x.resumeStatus ?? "Assigned", holdReason: undefined, resumeStatus: undefined } : { ...x, status: "On Hold", holdReason: reason.trim(), resumeStatus: x.status as "Assigned" | "In Progress" } : x));
    setRequests((s) => s.map((x) => x.id === r.id ? log(x, resume ? "Assignment resumed" : "Assignment placed on hold", resume ? "info" : "warn", { note: reason.trim() }) : x));
    return { ok: true };
  }

  const value: Ctx = useMemo(() => {
    const api: Ctx = {
      role,
      accountId, ownsVehicle, eligibleRequests,
      hasRole: (r) => availableRoles.includes(r),
      isAdmin: availableRoles.includes("admin"),
      userName,
      availableRoles,
      signIn: (name, _roles, id) => {
        const account = id ? accounts.find((a) => a.id === id) : accounts.find((a) => a.name === name);
        setUserName(account?.name ?? null);
        setSignedInId(account?.id ?? null);
        const resolved = account?.roles ?? [];
        setAvailableRoles(resolved);
        return resolved[0] ?? "customer";
      },
      signOut: () => {
        setUserName(null);
        setSignedInId(null);
        setAvailableRoles([]);
      },
      vehicles,
      requests,
      appointments,
      parts,
      invoices,
      users,
      technicians,
      specialties,
      notifications: notifications.filter(visibleNote),
      timeLogs,
      assignments,
      myTechId,
      laborRate,
      partRequests,

      addVehicle: (v) => {
        if (!can.customer || !accountId) return deny();
        setVehicles((s) => [...s, { ...v, customerId: accountId, id: uid("v") }]);
        return { ok: true };
      },
      updateVehicle: (v) => {
        if (!can.customer || !ownsVehicle(v.id)) return deny();
        setVehicles((s) => s.map((x) => x.id === v.id ? { ...v, customerId: x.customerId } : x));
        return { ok: true };
      },
      removeVehicle: (id) => {
        if (!can.customer || !ownsVehicle(id)) return deny();
        if (requests.some((r) => r.vehicleId === id) || appointments.some((a) => a.vehicleId === id)) return deny("Vehicles with service records cannot be removed.");
        setVehicles((s) => s.filter((x) => x.id !== id));
        return { ok: true };
      },

      createRequest: (r) => {
        if (!can.customer || !ownsVehicle(r.vehicleId)) { deny(); return ""; }
        const services = [...new Set(r.services.map((service) => service.trim()).filter(Boolean))];
        if (!services.length) { deny("Select at least one service."); return ""; }
        const id = uid("SR");
        const nr: ServiceRequest = {
          id,
          vehicleId: r.vehicleId,
          serviceType: services.join(", "),
          services,
          description: r.description,
          concern: r.description,
          stage: "Requested",
          createdAt: new Date().toISOString().slice(0, 10),
          preferredDate: r.preferredDate,
          preferredTime: r.preferredTime,
          repairs: [],
          timeline: [{ at: nowStamp(), label: "Service request submitted", kind: "info" }],
          total: 0,
        };
        setRequests((s) => [nr, ...s]);
        pushNote(`Service request ${id} submitted successfully.`, "ok");
        return id;
      },

      checkIn: (id, data) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        if (!r0 || !(can.admin || isMyJob(r0) || (can.customer && ownsRequest(r0)))) return deny();
        if (held(id) || r0.stage !== "Requested" || !lock(id)) return deny("This request cannot be checked in now.");
        const { mileageIn, exteriorCondition, interiorCondition, checkInNotes } = data;
        setRequests((s) => s.map((r) => r.id === id ? log({ ...r, mileageIn, exteriorCondition, interiorCondition, checkInNotes, stage: "Checked In" }, "Vehicle checked in", "info", { stage: "Checked In", note: checkInNotes }) : r));
        return { ok: true };
      },

      saveEstimate: (id, diagnosis, repairs, opts) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        if (!r0 || !isMyJob(r0)) return deny();
        if (held(id) || !EDITABLE_STAGES.includes(r0.stage)) return deny("This estimate is locked for review.");
        if (!diagnosis.trim() || !validLines(repairs, parts, laborRate) || (opts?.submit && !repairs.length)) return deny("Enter a diagnosis and valid estimate lines.");
        if (!lock(id)) return deny("This job is already being updated.");
        const priced = priceLines(repairs).map((l) => ({ ...l, approved: undefined }));
        setRequests((s) =>
          s.map((r) => {
            if (r.id !== id) return r;
            let next: ServiceRequest = { ...r, diagnosis, repairs: priced, total: sumLines(priced) };
            if (r.stage === "Checked In") next = log({ ...next, stage: "Diagnosed" }, "Diagnosis recorded", "info", { stage: "Diagnosed" });
            if (opts?.submit && priced.length) {
              next = log({ ...next, stage: "Pending Admin Review" }, "Estimate submitted for admin review", "info", { stage: "Pending Admin Review", note: opts.note });
            }
            return next;
          }),
        );
        if (opts?.submit && priced.length) pushNote(`Estimate for ${id} is waiting for admin review.`, "info", { roles: ["admin"] });
        return { ok: true };
      },

      submitEstimate: (id, note) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        if (!r0 || !isMyJob(r0)) return deny();
        if (held(id) || r0.stage !== "Diagnosed" || !r0.diagnosis?.trim() || !r0.repairs.length || !validLines(r0.repairs, parts, laborRate)) return deny("Add at least one estimate line before submitting.");
        if (!lock(id)) return deny("This job is already being updated.");
        setRequests((s) => s.map((r) => (r.id === id ? log({ ...r, stage: "Pending Admin Review" }, "Estimate submitted for admin review", "info", { stage: "Pending Admin Review", note }) : r)));
        pushNote(`Estimate for ${id} is waiting for admin review.`, "info", { roles: ["admin"] });
        return { ok: true };
      },

      reviewEstimate: (id, decision, note) => {
        if (!can.admin) return deny();
        note = note?.trim() || undefined;
        const r0 = live.current.requests.find((r) => r.id === id);
        if (!r0 || held(id) || r0.stage !== "Pending Admin Review") return deny("Only estimates pending review can be reviewed.");
        if (decision !== "send" && !note?.trim()) return deny("A reason is required.");
        if (decision === "send" && (!r0.diagnosis?.trim() || !r0.repairs.length || !validLines(r0.repairs, parts, laborRate))) return deny("A diagnosis and valid estimate are required.");
        if (!lock(id)) return deny("This job is already being updated.");
        setRequests((s) =>
          s.map((r) => {
            if (r.id !== id) return r;
            if (decision === "send") {
              const priced = priceLines(r.repairs);
              return log({ ...r, repairs: priced, total: sumLines(priced), stage: "Awaiting Customer Approval" }, "Estimate reviewed — sent for customer approval", "warn", { stage: "Awaiting Customer Approval", note });
            }
            return log({ ...r, repairs: r.repairs.map((l) => ({ ...l, approved: undefined })), stage: "Diagnosed" }, decision === "reject" ? "Estimate rejected by admin — correction needed" : "Revision requested by admin", "warn", { stage: "Diagnosed", note });
          }),
        );
        pushNote(decision === "send" ? `Estimate for ${id} is ready for your approval.` : `Estimate for ${id} needs revision.`, decision === "send" ? "ok" : "warn", decision === "send" ? { accountId: vehicles.find((v) => v.id === r0.vehicleId)?.customerId } : { roles: ["technician", "admin"] });
        return { ok: true };
      },

      approveRepairs: (id, repairIds, opts) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        const recordedByAdmin = !!opts?.method;
        if (recordedByAdmin ? !can.admin : !(can.customer && r0 && ownsRequest(r0))) return deny();
        // Repairs can never start without approval of an admin-reviewed estimate.
        if (!r0 || held(id) || r0.stage !== "Awaiting Customer Approval") return deny("This estimate is not awaiting customer approval.");
        if (!repairIds.length || repairIds.some((rid) => !r0.repairs.some((l) => l.id === rid))) return deny("Select at least one repair to approve.");
        if (!lock(id)) return deny("This job is already being updated.");
        setRequests((s) =>
          s.map((r) => {
            if (r.id !== id) return r;
            const repairs = r.repairs.map((rp) => ({ ...rp, approved: repairIds.includes(rp.id) }));
            const total = sumLines(repairs.filter((rp) => rp.approved));
            const label = recordedByAdmin ? `Customer consent recorded (${opts!.method})` : "Customer approved the repairs";
            return log({ ...r, repairs, total, stage: "In Repair" }, label, "ok", { stage: "In Repair", note: opts?.note });
          }),
        );
        pushNote(`Repairs approved for ${id}. Work will begin shortly.`, "ok", { accountId: vehicles.find((v) => v.id === r0.vehicleId)?.customerId });
        return { ok: true };
      },

      rejectRepairs: (id, opts) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        const recordedByAdmin = !!opts?.method;
        if (recordedByAdmin ? !can.admin : !(can.customer && r0 && ownsRequest(r0))) return deny();
        if (!r0 || held(id) || r0.stage !== "Awaiting Customer Approval") return deny();
        if (!lock(id)) return deny("This job is already being updated.");
        const label = recordedByAdmin ? `Customer rejection recorded (${opts!.method}) — revision needed` : "Customer rejected the estimate — revision needed";
        setRequests((s) => s.map((r) => (r.id === id ? log({ ...r, repairs: r.repairs.map((l) => ({ ...l, approved: undefined })), stage: "Diagnosed" }, label, "warn", { stage: "Diagnosed", note: opts?.note }) : r)));
        pushNote(`Estimate for ${id} was rejected and returned for revision.`, "warn", { accountId: vehicles.find((v) => v.id === r0.vehicleId)?.customerId });
        return { ok: true };
      },

      completeRepair: (id, note) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        if (!r0 || !(isMyJob(r0) || can.admin)) return deny();
        if (held(id) || r0.stage !== "In Repair" || !r0.repairs.some((l) => l.approved === true)) return deny("Only approved repairs in progress can be completed.");
        if (!lock(id)) return deny("This job is already being updated.");
        setRequests((s) => s.map((r) => (r.id === id ? log({ ...r, stage: "Completed" }, "Repair completed", "ok", { stage: "Completed", note }) : r)));
        if (!invoices.some((iv) => iv.requestId === id)) {
          setInvoices((iv) => [
            { id: uid("INV"), requestId: id, vehicleId: r0.vehicleId, date: new Date().toISOString().slice(0, 10), status: "Unpaid", taxRate: 0.08 },
            ...iv,
          ]);
        }
        // Completing the work also completes the (separate) assignment record.
        setAssignments((s) => s.map((a) => (a.requestId === id ? { ...a, status: "Completed" } : a)));
        pushNote(`Repair ${id} is completed.`, "ok", { accountId: vehicles.find((v) => v.id === r0.vehicleId)?.customerId });
        return { ok: true };
      },

      setLaborRate: (n) => {
        if (!can.admin) return deny();
        if (!Number.isFinite(n) || n < 0) return deny("Enter a valid labor rate.");
        setLaborRateState(n);
      },

      requestPart: (requestId, partId, qty, note) => {
        const r0 = live.current.requests.find((r) => r.id === requestId);
        if (!r0 || held(requestId) || r0.stage === "Completed" || !parts.some((p) => p.id === partId) || !Number.isInteger(qty) || qty < 1 || !isMyJob(r0) || !myTechId) return deny("You can only request parts for jobs assigned to you.");
        if (!lock(requestId)) return deny("This job is already being updated.");
        setPartRequests((s) => [{ id: uid("pr"), requestId, partId, qty, technicianId: myTechId, status: "Pending", at: nowStamp(), note }, ...s]);
        const part = parts.find((p) => p.id === partId);
        setRequests((s) => s.map((r) => (r.id === requestId ? log(r, `Requested ${qty} × ${part?.name ?? "part"}`, "info", { note }) : r)));
        return { ok: true };
      },

      resolvePartRequest: (id, approve) => {
        if (!can.admin) return deny();
        const pr = partRequests.find((x) => x.id === id);
        if (!pr || pr.status !== "Pending") return;
        const part = parts.find((p) => p.id === pr.partId);
        if (approve && (!part || part.quantity < pr.qty)) return deny("Not enough stock to issue this request.");
        setPartRequests((s) => s.map((x) => (x.id === id ? { ...x, status: approve ? "Issued" : "Rejected", resolvedBy: userName ?? "Admin" } : x)));
        if (approve) setParts((s) => s.map((p) => (p.id === pr.partId ? { ...p, quantity: p.quantity - pr.qty } : p)));
        setRequests((s) => s.map((r) => (r.id === pr.requestId ? log(r, `${approve ? "Issued" : "Rejected"} ${pr.qty} × ${part?.name ?? "part"} from inventory`, approve ? "ok" : "warn") : r)));
      },

      addTimeLog: (e) => {
        if (!can.tech || !myTechId) return deny("Only technicians can log their own hours.");
        const r = live.current.requests.find((r) => r.id === e.requestId);
        if (!r || !isMyJob(r) || held(r.id) || r.stage === "Completed" || !Number.isFinite(e.hours) || e.hours <= 0) return deny("Only open, non-held assigned jobs can receive time logs.");
        if (!lock(r.id)) return deny("This job is already being updated.");
        setTimeLogs((s) => [{ ...e, id: uid("tl"), technicianId: myTechId }, ...s]);
        return { ok: true };
      },
      removeTimeLog: (id) => {
        const e = timeLogs.find((x) => x.id === id);
        if (!e || e.technicianId !== myTechId) return deny();
        setTimeLogs((s) => s.filter((x) => x.id !== id));
      },

      addAppointment: (a) => {
        if (!(can.admin || (can.customer && ownsVehicle(a.vehicleId)))) return deny();
        if (!vehicles.some((v) => v.id === a.vehicleId) || (a.requestId && !requests.some((r) => r.id === a.requestId && r.vehicleId === a.vehicleId))) return deny("Select a matching vehicle and request.");
        const services = [...new Set((a.services ?? [a.serviceType]).map((service) => service.trim()).filter(Boolean))];
        if (!services.length) return deny("Select at least one service.");
        setAppointments((s) => [...s, { ...a, services, serviceType: services.join(", "), id: uid("a"), status: "Scheduled" }]);
        return { ok: true };
      },
      rescheduleAppointment: (id, date, time) => {
        const a = appointments.find((a) => a.id === id);
        if (!a || !(can.admin || (can.customer && ownsVehicle(a.vehicleId)))) return deny();
        setAppointments((s) => s.map((a) => a.id === id ? { ...a, date, time } : a));
        return { ok: true };
      },
      cancelAppointment: (id) => {
        const a = appointments.find((a) => a.id === id);
        if (!a || !(can.admin || (can.customer && ownsVehicle(a.vehicleId)))) return deny();
        setAppointments((s) => s.map((a) => a.id === id ? { ...a, status: "Cancelled" } : a));
        return { ok: true };
      },

      addPart: (p) => setParts((s) => [...s, { ...p, id: uid("p") }]),
      updatePart: (p) => setParts((s) => s.map((x) => (x.id === p.id ? p : x))),
      removePart: (id) => {
        if (partRequests.some((p) => p.partId === id) || requests.some((r) => r.repairs.some((l) => l.partId === id))) return deny("Parts linked to service records cannot be removed.");
        setParts((s) => s.filter((x) => x.id !== id));
      },

      addUser: (u) => setUsers((s) => [...s, { ...u, id: uid("u") }]),
      updateUser: (u) => setUsers((s) => s.map((x) => (x.id === u.id ? u : x))),
      removeUser: (id) => setUsers((s) => s.filter((x) => x.id !== id)),

      addTechnician: (t) => {
        setTechnicians((s) => [...s, { id: uid("t"), name: t.name, email: t.email, phone: t.phone, status: t.status, specialties: t.specialties, activeJobs: 0, completed: 0, rating: 0 }]);
        setUsers((s) => [...s, { id: uid("u"), name: t.name, email: t.email, phone: t.phone, role: "Technician", status: t.status === "Off" ? "Suspended" : "Active" }]);
        // Mock backend: register a login so the new technician can sign in.
        accounts.push({ id: uid("account"), name: t.name, email: t.email, phone: t.phone, roles: ["technician"] });
        pushNote(`Technician ${t.name} was added.`, "ok");
      },
      // Specialty catalog — only the admin UI exposes these mutations.
      setTechnicianSpecialties: (id, list) =>
        setTechnicians((s) => s.map((x) => (x.id === id ? { ...x, specialties: list } : x))),
      addSpecialty: (name) => setSpecialties((s) => (s.includes(name) ? s : [...s, name])),
      renameSpecialty: (from, to) => {
        setSpecialties((s) => s.map((x) => (x === from ? to : x)));
        setTechnicians((s) => s.map((x) => ({ ...x, specialties: x.specialties.map((y) => (y === from ? to : y)) })));
      },
      removeSpecialty: (name) => {
        setSpecialties((s) => s.filter((x) => x !== name));
        setTechnicians((s) => s.map((x) => ({ ...x, specialties: x.specialties.filter((y) => y !== name) })));
      },
      updateTechnician: (t) => {
        const prev = technicians.find((x) => x.id === t.id);
        setTechnicians((s) => s.map((x) => (x.id === t.id ? t : x)));
        // Keep the matching user account in sync.
        if (prev) setUsers((s) => s.map((u) => (u.email.toLowerCase() === prev.email.toLowerCase() ? { ...u, name: t.name, email: t.email, phone: t.phone ?? u.phone } : u)));
      },
      addAssignment: (a) => {
        if (!can.admin) return deny();
        const r = live.current.requests.find((r) => r.id === a.requestId);
        const t = technicians.find((t) => t.id === a.technicianId);
        if (!r || r.stage === "Completed" || r.technicianId || live.current.assignments.some((x) => x.requestId === r.id) || !t || t.status === "Off" || a.status !== "Assigned") return deny("Choose an open unassigned request and an Available or Busy technician.");
        if (!lock(r.id)) return deny("This request is already being updated.");
        setAssignments((s) => [{ ...a, status: "Assigned", id: uid("as"), assignedAt: new Date().toISOString().slice(0, 10) }, ...s]);
        setRequests((s) => s.map((x) => x.id === r.id ? log({ ...x, technicianId: t.id }, `Assigned to ${t.name}`, "info", { note: a.notes }) : x));
        return { ok: true };
      },
      updateAssignment: (a) => {
        if (!can.admin) return deny();
        const prev = live.current.assignments.find((x) => x.id === a.id);
        const t = technicians.find((x) => x.id === a.technicianId);
        if (!prev || prev.requestId !== a.requestId || ["On Hold", "Completed"].includes(prev.status) || !["Assigned", "In Progress"].includes(a.status) || !t || (t.status === "Off" && t.id !== prev.technicianId)) return deny("This assignment cannot be edited. Use Hold/Resume for held jobs.");
        if (!lock(prev.requestId)) return deny("This request is already being updated.");
        setAssignments((s) => s.map((x) => x.id === a.id ? { ...prev, technicianId: a.technicianId, status: a.status, notes: a.notes } : x));
        setRequests((s) => s.map((r) => r.id === prev.requestId ? log({ ...r, technicianId: a.technicianId }, prev.technicianId !== a.technicianId ? `Reassigned to ${t.name}` : `Assignment status: ${a.status}`, "info", { note: a.notes }) : r));
        return { ok: true };
      },
      removeAssignment: (id) => {
        if (!can.admin) return deny();
        const a = live.current.assignments.find((x) => x.id === id);
        if (!a || ["On Hold", "Completed"].includes(a.status)) return deny("Resume held jobs before unassigning; completed jobs are read-only.");
        if (!lock(a.requestId)) return deny("This request is already being updated.");
        setAssignments((s) => s.filter((x) => x.id !== id));
        setRequests((s) => s.map((r) => r.id === a.requestId ? log({ ...r, technicianId: undefined }, "Technician unassigned", "warn") : r));
        return { ok: true };
      },
      holdAssignment: (id, reason) => changeHold(id, reason, false),
      resumeAssignment: (id, reason) => changeHold(id, reason, true),

      markAllRead: () => setNotifications((s) => s.map((n) => visibleNote(n) ? { ...n, read: true } : n)),
      unreadCount: notifications.filter((n) => visibleNote(n) && !n.read).length,
    };
    return api;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userName, signedInId, availableRoles, vehicles, requests, appointments, parts, invoices, users, technicians, specialties, notifications, timeLogs, assignments, partRequests, laborRate]);

  return <AppCtx.Provider value={value}>{persistenceWarning && <div role="alert" className="bg-warn-50 p-3 text-sm text-warn-700">Session storage is unavailable. Changes may not survive refresh.</div>}{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

/** Editable estimate stages for the assigned technician. */
export const EDITABLE_STAGES: string[] = ["Checked In", "Diagnosed"];

/** Price an estimate line from shared inventory prices and the admin labor rate. */
export function lineCost(l: RepairLine, parts: Part[], laborRate: number) {
  if (l.partId) return (parts.find((p) => p.id === l.partId)?.price ?? 0) * (l.qty ?? 1);
  if (l.type === "Labor" && l.hours != null) return l.hours * laborRate;
  return l.cost; // legacy fixed-price line
}
export function sumLines(lines: RepairLine[]) {
  return lines.reduce((a, b) => a + b.cost, 0);
}

export function vehicleLabel(v?: Vehicle) {
  return v ? `${v.make} ${v.model} ${v.year}` : "Unknown Vehicle";
}


/** Customer surfaces stay scoped even for accounts with additional staff roles. */
export function useCustomerApp() {
  const app = useApp();
  const vehicles = app.vehicles.filter((v) => v.customerId === app.accountId);
  const ids = new Set(vehicles.map((v) => v.id));
  const requests = app.requests.filter((r) => ids.has(r.vehicleId));
  return { ...app, vehicles, requests, appointments: app.appointments.filter((a) => ids.has(a.vehicleId) && (!a.requestId || requests.some((r) => r.id === a.requestId && r.vehicleId === a.vehicleId))), invoices: app.invoices.filter((i) => ids.has(i.vehicleId) && requests.some((r) => r.id === i.requestId && r.vehicleId === i.vehicleId)) };
}
function validLines(lines: RepairLine[], parts: Part[], laborRate: number) {
  return new Set(lines.map((l) => l.id)).size === lines.length && lines.every((l) => l.id && l.item.trim() && Number.isFinite(lineCost(l, parts, laborRate)) && lineCost(l, parts, laborRate) >= 0 && (l.partId ? parts.some((p) => p.id === l.partId) && Number.isInteger(l.qty ?? 1) && (l.qty ?? 1) > 0 : l.hours != null ? Number.isFinite(l.hours) && l.hours > 0 && l.hours <= 40 : Number.isFinite(l.cost)));
}
