import {
  createContext,
  useContext,
  useEffect,
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
  assignments as seedAssignments,
  accounts as seedAccounts,
} from "../data/mock";
import type { Account, Appointment, AppNotification, AppUser, Invoice, Part, PartRequest, RepairLine, Role, ServiceAssignment, ServiceRequest, Technician, TimelineEntry, TimeLogEntry, Vehicle } from "../types";
import { LABOR_RATE, ROLE_PRIORITY, APPOINTMENT_TIMES, serviceTypes } from "../lib/constants";
import { accountForIdentifier, emailValid, userRole } from "../lib/accounts";
import { estimateError, lineCost, sumLines, validLines } from "../lib/estimates";
import { iso, isIsoDate } from "../lib/dates";
import { restoreShop, SNAPSHOT_KEY } from "./persistence";
export { lineCost, sumLines } from "../lib/estimates";

function nowStamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ActionResult = { ok: true } | { ok: false; error: string };

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
  accounts: Account[];
  signIn: (identifier: string) => ActionResult;
  registerCustomer: (data: Pick<Account, "name" | "email" | "phone">) => ActionResult;
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
  checkIn: (id: string, data: Pick<ServiceRequest, "mileageIn" | "exteriorCondition" | "interiorCondition" | "checkInNotes">) => ActionResult;
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
  setLaborRate: (n: number) => ActionResult;
  partRequests: PartRequest[];
  requestPart: (requestId: string, partId: string, qty: number, note: string) => ActionResult;
  resolvePartRequest: (id: string, approve: boolean) => ActionResult;
  addTimeLog: (e: Omit<TimeLogEntry, "id" | "technicianId">) => ActionResult;
  removeTimeLog: (id: string) => ActionResult;

  addAppointment: (a: Omit<Appointment, "id" | "status">) => ActionResult;
  rescheduleAppointment: (id: string, date: string, time: string) => ActionResult;
  cancelAppointment: (id: string) => ActionResult;

  addPart: (p: Omit<Part, "id">) => ActionResult;
  updatePart: (p: Part) => ActionResult;
  removePart: (id: string) => ActionResult;

  addUser: (u: Omit<AppUser, "id">) => ActionResult;
  updateUser: (u: AppUser) => ActionResult;
  removeUser: (id: string) => ActionResult;

  addTechnician: (t: { name: string; email: string; phone: string; status: Technician["status"]; specialties: string[] }) => ActionResult;
  setTechnicianSpecialties: (id: string, list: string[]) => ActionResult;
  updateTechnician: (t: Technician) => ActionResult;
  addSpecialty: (name: string) => ActionResult;
  renameSpecialty: (from: string, to: string) => ActionResult;
  removeSpecialty: (name: string) => ActionResult;
  addAssignment: (a: Omit<ServiceAssignment, "id" | "assignedAt">) => ActionResult;
  updateAssignment: (a: ServiceAssignment) => ActionResult;
  removeAssignment: (id: string) => ActionResult;

  markAllRead: () => void;
  unreadCount: number;
};

const AppCtx = createContext<Ctx | null>(null);

const uid = (p: string) => `${p}-${crypto.randomUUID()}`;
function storedAccount(accounts: Account[]) {
  try {
    const id = sessionStorage.getItem("as_account");
    return id ? accounts.find((account) => account.id === id) : accounts.find((account) => account.name === sessionStorage.getItem("as_user"));
  } catch { return undefined; }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [{ snapshot, warning }] = useState(restoreShop);
  const [persistenceWarning, setPersistenceWarning] = useState(warning);
  const [accounts, setAccounts] = useState<Account[]>(() => snapshot?.accounts ?? seedAccounts);
  const [signedInId, setSignedInId] = useState<string | null>(() => storedAccount(snapshot?.accounts ?? seedAccounts)?.id ?? null);
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

  const account = accounts.find((a) => a.id === signedInId && users.some((u) => u.email.toLowerCase() === a.email.toLowerCase() && u.status === "Active"));
  const userName = account?.name ?? null;
  const availableRoles = account?.roles ?? [];
  const role = ROLE_PRIORITY.find((r) => availableRoles.includes(r)) ?? "customer";

  useEffect(() => {
    try {
      if (account) {
        sessionStorage.setItem("as_account", account.id);
        sessionStorage.setItem("as_user", account.name);
        sessionStorage.setItem("as_roles", JSON.stringify(account.roles));
      } else {
        sessionStorage.removeItem("as_account");
        sessionStorage.removeItem("as_user");
        sessionStorage.removeItem("as_roles");
      }
    } catch { setPersistenceWarning("Session storage is unavailable. Changes may not survive refresh."); }
  }, [account]);

  useEffect(() => {
    try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: 2, vehicles, requests, appointments, parts, invoices, users, technicians, specialties, assignments, notifications, timeLogs, partRequests, laborRate, accounts })); }
    catch { setPersistenceWarning("Session storage is unavailable. Changes may not survive refresh."); }
  }, [vehicles, requests, appointments, parts, invoices, users, technicians, specialties, assignments, notifications, timeLogs, partRequests, laborRate, accounts]);
  // Serialize job transitions until React commits their related collection updates.
  const pending = useRef(new Set<string>());
  useEffect(() => { pending.current.clear(); });
  const live = useRef({ requests, assignments });
  live.current = { requests, assignments };
  const lock = (id: string) => { if (pending.current.has(id)) return false; pending.current.add(id); return true; };
  const can = { admin: availableRoles.includes("admin"), tech: availableRoles.includes("technician"), customer: availableRoles.includes("customer") };
  const accountId = account?.id ?? null;
  const ownsVehicle = (id: string) => !!accountId && vehicles.some((v) => v.id === id && v.customerId === accountId);
  const ownsRequest = (r: ServiceRequest) => ownsVehicle(r.vehicleId);
  const held = (id: string) => live.current.assignments.some((a) => a.requestId === id && a.status === "On Hold");
  const eligibleRequests = requests.filter((r) => r.stage !== "Completed" && !r.technicianId && !assignments.some((a) => a.requestId === r.id));
  const visibleNote = (n: AppNotification) => (!!accountId && n.accountId === accountId) || !!n.roles?.some((r) => availableRoles.includes(r));
  const myTechId = can.tech ? technicians.find((t) => t.email.toLowerCase() === account?.email.toLowerCase())?.id ?? null : null;
  const isMyJob = (r: ServiceRequest) => can.tech && !!myTechId && r.technicianId === myTechId;
  const actorRole = () => (can.admin ? "Admin" : can.tech ? "Technician" : "Customer");
  function deny(msg = "You don't have permission to perform this action.") {
    pushNote(msg, "warn");
    return { ok: false as const, error: msg };
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

  function userError(user: Omit<AppUser, "id">, previousEmail?: string) {
    if (user.name.trim().length < 2 || !emailValid(user.email)) return "Enter a name and valid email address.";
    const email = user.email.trim().toLowerCase();
    if ([...users, ...accounts, ...technicians].some((u) => u.email.toLowerCase() === email && u.email.toLowerCase() !== previousEmail?.toLowerCase())) return "That email is already in use.";
    if (user.phone && user.phone.replace(/\D/g, "").length < 10) return "Enter a phone number with at least 10 digits.";
    return "";
  }
  function isLastAdmin(email: string) {
    return accounts.some((a) => a.email.toLowerCase() === email.toLowerCase() && a.roles.includes("admin")) &&
      !accounts.some((a) => a.email.toLowerCase() !== email.toLowerCase() && a.roles.includes("admin") && users.some((u) => u.email.toLowerCase() === a.email.toLowerCase() && u.status === "Active"));
  }

  const value: Ctx = {
      role,
      accountId, ownsVehicle, eligibleRequests,
      hasRole: (r) => availableRoles.includes(r),
      isAdmin: can.admin,
      userName,
      availableRoles,
      accounts,
      signIn: (identifier) => {
        const next = accountForIdentifier(accounts, identifier);
        if (!next || !users.some((u) => u.email.toLowerCase() === next.email.toLowerCase() && u.status === "Active")) return deny("No active demo account matches that email or phone.");
        setSignedInId(next.id);
        return { ok: true };
      },
      registerCustomer: (data) => {
        const name = data.name.trim();
        const email = data.email.trim().toLowerCase();
        const phone = data.phone.trim();
        if (name.length < 2 || !emailValid(email)) return deny("Enter a name and valid email address.");
        if (accounts.some((a) => a.email.toLowerCase() === email) || users.some((u) => u.email.toLowerCase() === email)) return deny("That email is already in use.");
        if (phone && (phone.replace(/\D/g, "").length < 10 || accountForIdentifier(accounts, phone))) return deny("Enter a unique phone number with at least 10 digits.");
        if (!lock(`account:${email}`)) return deny("This account is already being created.");
        const id = uid("account");
        setAccounts((s) => [...s, { id, name, email, phone, roles: ["customer"] }]);
        setUsers((s) => [...s, { id, name, email, phone, role: "Customer", status: "Active" }]);
        setSignedInId(id);
        return { ok: true };
      },
      signOut: () => setSignedInId(null),
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
        if (!validVehicle(v)) return deny("Enter valid vehicle details, year, and nonnegative mileage.");
        setVehicles((s) => [...s, { ...v, customerId: accountId, id: uid("v") }]);
        return { ok: true };
      },
      updateVehicle: (v) => {
        if (!can.customer || !ownsVehicle(v.id)) return deny();
        if (!validVehicle(v)) return deny("Enter valid vehicle details, year, and nonnegative mileage.");
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
        if (!services.length || services.some((s) => !serviceTypes.includes(s)) || !r.description.trim() || (r.preferredDate && !isIsoDate(r.preferredDate)) || (r.preferredTime && !APPOINTMENT_TIMES.includes(r.preferredTime))) { deny("Choose valid services and describe the issue."); return ""; }
        const id = uid("SR");
        const nr: ServiceRequest = {
          id,
          vehicleId: r.vehicleId,
          serviceType: services.join(", "),
          services,
          description: r.description,
          concern: r.description,
          stage: "Requested",
          createdAt: iso(new Date()),
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
        if (data.mileageIn !== undefined && (!Number.isFinite(data.mileageIn) || data.mileageIn < 0)) return deny("Mileage must be a nonnegative number.");
        if (held(id) || r0.stage !== "Requested" || !lock(id)) return deny("This request cannot be checked in now.");
        const { mileageIn, exteriorCondition, interiorCondition, checkInNotes } = data;
        setRequests((s) => s.map((r) => r.id === id ? log({ ...r, mileageIn, exteriorCondition, interiorCondition, checkInNotes, stage: "Checked In" }, "Vehicle checked in", "info", { stage: "Checked In", note: checkInNotes }) : r));
        return { ok: true };
      },

      saveEstimate: (id, diagnosis, repairs, opts) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        if (!r0 || !isMyJob(r0)) return deny();
        if (held(id) || !EDITABLE_STAGES.includes(r0.stage)) return deny("This estimate is locked for review.");
        const error = estimateError(diagnosis, repairs, parts, laborRate, opts?.submit);
        if (error) return deny(error);
        if (!lock(id)) return deny("This job is already being updated.");
        const priced = priceLines(repairs).map((l) => ({ ...l, approved: undefined }));
        setRequests((s) =>
          s.map((r) => {
            if (r.id !== id) return r;
            let next: ServiceRequest = { ...r, diagnosis: diagnosis.trim(), repairs: priced, total: sumLines(priced) };
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
        const recordedByAdmin = !!opts?.method?.trim();
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
            const label = recordedByAdmin ? `Customer consent recorded (${opts?.method})` : "Customer approved the repairs";
            return log({ ...r, repairs, total, stage: "In Repair" }, label, "ok", { stage: "In Repair", note: opts?.note });
          }),
        );
        pushNote(`Repairs approved for ${id}. Work will begin shortly.`, "ok", { accountId: vehicles.find((v) => v.id === r0.vehicleId)?.customerId });
        return { ok: true };
      },

      rejectRepairs: (id, opts) => {
        const r0 = live.current.requests.find((r) => r.id === id);
        const recordedByAdmin = !!opts?.method?.trim();
        if (recordedByAdmin ? !can.admin : !(can.customer && r0 && ownsRequest(r0))) return deny();
        if (!r0 || held(id) || r0.stage !== "Awaiting Customer Approval") return deny();
        if (!lock(id)) return deny("This job is already being updated.");
        const label = recordedByAdmin ? `Customer rejection recorded (${opts?.method}) — revision needed` : "Customer rejected the estimate — revision needed";
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
            { id: uid("INV"), requestId: id, vehicleId: r0.vehicleId, date: iso(new Date()), status: "Unpaid", taxRate: 0.08 },
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
        return { ok: true };
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
        if (!pr || pr.status !== "Pending") return deny("This part request has already been resolved.");
        const part = parts.find((p) => p.id === pr.partId);
        if (approve && (!part || part.quantity < pr.qty)) return deny("Not enough stock to issue this request.");
        if (!lock(`part:${pr.partId}`)) return deny("This part is already being updated. Try again.");
        setPartRequests((s) => s.map((x) => (x.id === id ? { ...x, status: approve ? "Issued" : "Rejected", resolvedBy: userName ?? "Admin" } : x)));
        if (approve) setParts((s) => s.map((p) => (p.id === pr.partId ? { ...p, quantity: p.quantity - pr.qty } : p)));
        setRequests((s) => s.map((r) => (r.id === pr.requestId ? log(r, `${approve ? "Issued" : "Rejected"} ${pr.qty} × ${part?.name ?? "part"} from inventory`, approve ? "ok" : "warn") : r)));
        return { ok: true };
      },

      addTimeLog: (e) => {
        if (!can.tech || !myTechId) return deny("Only technicians can log their own hours.");
        const r = live.current.requests.find((r) => r.id === e.requestId);
        if (!r || !isMyJob(r) || held(r.id) || r.stage === "Completed" || !Number.isFinite(e.hours) || e.hours <= 0 || e.hours > 16 || !e.task.trim() || !isIsoDate(e.date) || e.date > iso(new Date())) return deny("Only open, non-held assigned jobs can receive time logs.");
        if (!lock(r.id)) return deny("This job is already being updated.");
        setTimeLogs((s) => [{ ...e, id: uid("tl"), technicianId: myTechId }, ...s]);
        return { ok: true };
      },
      removeTimeLog: (id) => {
        const e = timeLogs.find((x) => x.id === id);
        if (!e || e.technicianId !== myTechId) return deny();
        setTimeLogs((s) => s.filter((x) => x.id !== id));
        return { ok: true };
      },

      addAppointment: (a) => {
        if (!(can.admin || (can.customer && ownsVehicle(a.vehicleId)))) return deny();
        if (!isIsoDate(a.date) || a.date < iso(new Date()) || !APPOINTMENT_TIMES.includes(a.time)) return deny("Choose a valid date from today onward and a service time.");
        if (!vehicles.some((v) => v.id === a.vehicleId) || (a.requestId && !requests.some((r) => r.id === a.requestId && r.vehicleId === a.vehicleId))) return deny("Select a matching vehicle and request.");
        const services = [...new Set((a.services ?? [a.serviceType]).map((service) => service.trim()).filter(Boolean))];
        if (!services.length || services.some((s) => !serviceTypes.includes(s))) return deny("Select at least one valid service.");
        setAppointments((s) => [...s, { ...a, services, serviceType: services.join(", "), id: uid("a"), status: "Scheduled" }]);
        return { ok: true };
      },
      rescheduleAppointment: (id, date, time) => {
        const a = appointments.find((a) => a.id === id);
        if (!a || !(can.admin || (can.customer && ownsVehicle(a.vehicleId)))) return deny();
        if (a.status !== "Scheduled" || !isIsoDate(date) || date < iso(new Date()) || !APPOINTMENT_TIMES.includes(time)) return deny("Only scheduled appointments can be moved to a valid service date and time.");
        setAppointments((s) => s.map((a) => a.id === id ? { ...a, date, time } : a));
        return { ok: true };
      },
      cancelAppointment: (id) => {
        const a = appointments.find((a) => a.id === id);
        if (!a || !(can.admin || (can.customer && ownsVehicle(a.vehicleId)))) return deny();
        if (a.status !== "Scheduled") return deny("Only scheduled appointments can be cancelled.");
        setAppointments((s) => s.map((a) => a.id === id ? { ...a, status: "Cancelled" } : a));
        return { ok: true };
      },

      addPart: (part) => {
        if (!can.admin) return deny();
        if (!validPart(part) || parts.some((p) => p.number.toLowerCase() === part.number.trim().toLowerCase())) return deny("Enter a unique part number, name, whole stock quantity, and nonnegative price.");
        setParts((s) => [...s, { ...part, name: part.name.trim(), number: part.number.trim(), id: uid("p") }]);
        return { ok: true };
      },
      updatePart: (part) => {
        if (!can.admin) return deny();
        if (!parts.some((p) => p.id === part.id) || !validPart(part) || parts.some((p) => p.id !== part.id && p.number.toLowerCase() === part.number.trim().toLowerCase())) return deny("Enter valid, unique part details.");
        setParts((s) => s.map((p) => p.id === part.id ? { ...part, name: part.name.trim(), number: part.number.trim() } : p));
        return { ok: true };
      },
      removePart: (id) => {
        if (!can.admin) return deny();
        if (partRequests.some((p) => p.partId === id) || requests.some((r) => r.repairs.some((l) => l.partId === id))) return deny("Parts linked to service records cannot be removed.");
        setParts((s) => s.filter((p) => p.id !== id));
        return { ok: true };
      },
      addUser: (user) => {
        if (!can.admin) return deny();
        const error = userError(user);
        if (error) return deny(error);
        const id = uid("u");
        const data = { ...user, name: user.name.trim(), email: user.email.trim().toLowerCase(), phone: user.phone.trim() };
        setUsers((s) => [...s, { ...data, id }]);
        setAccounts((s) => [...s, { id, name: data.name, email: data.email, phone: data.phone, roles: [userRole(user.role)] }]);
        return { ok: true };
      },
      updateUser: (user) => {
        if (!can.admin) return deny();
        const previous = users.find((u) => u.id === user.id);
        if (!previous) return deny("User not found.");
        const error = userError(user, previous.email);
        if (error) return deny(error);
        if (isLastAdmin(previous.email) && (user.status !== "Active" || userRole(user.role) !== "admin")) return deny("Keep at least one active administrator.");
        if (technicians.some((t) => t.email.toLowerCase() === previous.email.toLowerCase()) && user.role !== previous.role) return deny("A linked technician's role cannot be changed here.");
        const data = { ...user, name: user.name.trim(), email: user.email.trim().toLowerCase(), phone: user.phone.trim() };
        setUsers((s) => s.map((u) => u.id === user.id ? data : u));
        setAccounts((s) => s.map((a) => a.email.toLowerCase() === previous.email.toLowerCase() ? { ...a, name: data.name, email: data.email, phone: data.phone, roles: user.role === previous.role ? a.roles : [userRole(user.role)] } : a));
        setTechnicians((s) => s.map((t) => t.email.toLowerCase() === previous.email.toLowerCase() ? { ...t, name: data.name, email: data.email, phone: data.phone } : t));
        return { ok: true };
      },
      removeUser: (id) => {
        if (!can.admin) return deny();
        const user = users.find((u) => u.id === id);
        if (!user) return deny("User not found.");
        const linked = accounts.find((a) => a.email.toLowerCase() === user.email.toLowerCase());
        if (linked?.id === accountId || isLastAdmin(user.email) || vehicles.some((v) => v.customerId === linked?.id) || technicians.some((t) => t.email.toLowerCase() === user.email.toLowerCase())) return deny("Keep your own account and users linked to shop records. Suspend linked accounts instead.");
        setUsers((s) => s.filter((u) => u.id !== id));
        setAccounts((s) => s.filter((a) => a.id !== linked?.id));
        return { ok: true };
      },
      addTechnician: (tech) => {
        if (!can.admin) return deny();
        const error = userError({ ...tech, role: "Technician", status: "Active" });
        if (error) return deny(error);
        if (!tech.specialties.length || tech.specialties.some((s) => !specialties.includes(s))) return deny("Choose valid specialties.");
        const data = { ...tech, name: tech.name.trim(), email: tech.email.trim().toLowerCase(), phone: tech.phone.trim() };
        const id = uid("u");
        setTechnicians((s) => [...s, { ...data, id: uid("t"), activeJobs: 0, completed: 0, rating: 0 }]);
        setUsers((s) => [...s, { id, name: data.name, email: data.email, phone: data.phone, role: "Technician", status: tech.status === "Off" ? "Suspended" : "Active" }]);
        setAccounts((s) => [...s, { id, name: data.name, email: data.email, phone: data.phone, roles: ["technician"] }]);
        pushNote(`Technician ${data.name} was added.`, "ok");
        return { ok: true };
      },
      setTechnicianSpecialties: (id, list) => {
        if (!can.admin) return deny();
        if (list.some((s) => !specialties.includes(s))) return deny("Choose valid specialties.");
        setTechnicians((s) => s.map((t) => t.id === id ? { ...t, specialties: [...new Set(list)] } : t));
        return { ok: true };
      },
      addSpecialty: (name) => {
        if (!can.admin) return deny();
        name = name.trim();
        if (name.length < 2 || specialties.some((s) => s.toLowerCase() === name.toLowerCase())) return deny("Enter a unique specialty name with at least two characters.");
        setSpecialties((s) => [...s, name]);
        return { ok: true };
      },
      renameSpecialty: (from, to) => {
        if (!can.admin) return deny();
        to = to.trim();
        if (!specialties.includes(from) || to.length < 2 || specialties.some((s) => s !== from && s.toLowerCase() === to.toLowerCase())) return deny("Enter a unique specialty name with at least two characters.");
        setSpecialties((s) => s.map((name) => name === from ? to : name));
        setTechnicians((s) => s.map((t) => ({ ...t, specialties: t.specialties.map((name) => name === from ? to : name) })));
        return { ok: true };
      },
      removeSpecialty: (name) => {
        if (!can.admin) return deny();
        setSpecialties((s) => s.filter((s) => s !== name));
        setTechnicians((s) => s.map((t) => ({ ...t, specialties: t.specialties.filter((s) => s !== name) })));
        return { ok: true };
      },
      updateTechnician: (tech) => {
        if (!can.admin) return deny();
        const previous = technicians.find((t) => t.id === tech.id);
        if (!previous) return deny("Technician not found.");
        const error = userError({ name: tech.name, email: tech.email, phone: tech.phone ?? "", role: "Technician", status: "Active" }, previous.email);
        if (error) return deny(error);
        if (tech.specialties.some((s) => !specialties.includes(s))) return deny("Choose valid specialties.");
        const data = { ...tech, name: tech.name.trim(), email: tech.email.trim().toLowerCase() };
        setTechnicians((s) => s.map((t) => t.id === tech.id ? data : t));
        setUsers((s) => s.map((u) => u.email.toLowerCase() === previous.email.toLowerCase() ? { ...u, name: data.name, email: data.email, phone: data.phone ?? u.phone } : u));
        setAccounts((s) => s.map((a) => a.email.toLowerCase() === previous.email.toLowerCase() ? { ...a, name: data.name, email: data.email, phone: data.phone ?? a.phone } : a));
        return { ok: true };
      },
      addAssignment: (a) => {
        if (!can.admin) return deny();
        const r = live.current.requests.find((r) => r.id === a.requestId);
        const t = technicians.find((t) => t.id === a.technicianId);
        if (!r || r.stage === "Completed" || r.technicianId || live.current.assignments.some((x) => x.requestId === r.id) || !t || t.status === "Off" || a.status !== "Assigned") return deny("Choose an open unassigned request and an Available or Busy technician.");
        if (!lock(r.id)) return deny("This request is already being updated.");
        setAssignments((s) => [{ ...a, status: "Assigned", id: uid("as"), assignedAt: iso(new Date()) }, ...s]);
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

  return <AppCtx.Provider value={value}>{persistenceWarning && <div role="alert" className="bg-warn-50 p-3 text-sm text-warn-700">{persistenceWarning}</div>}{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

/** Editable estimate stages for the assigned technician. */
export const EDITABLE_STAGES: string[] = ["Checked In", "Diagnosed"];

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

function validPart(part: Omit<Part, "id">) {
  return !!part.name.trim() && !!part.number.trim() && Number.isInteger(part.quantity) && part.quantity >= 0 && Number.isFinite(part.price) && part.price >= 0;
}
function validVehicle(vehicle: Omit<Vehicle, "id" | "customerId">) {
  return !!vehicle.make.trim() && !!vehicle.model.trim() && !!vehicle.vin.trim() && Number.isInteger(vehicle.year) && vehicle.year >= 1886 && vehicle.year <= new Date().getFullYear() + 1 && Number.isFinite(vehicle.mileage) && vehicle.mileage >= 0;
}
