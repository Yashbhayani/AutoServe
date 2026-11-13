import type { Account, Appointment, AppNotification, AppUser, Invoice, Part, PartRequest, ServiceAssignment, ServiceRequest, Technician, TimeLogEntry, Vehicle } from "../types";
import { ROLE_PRIORITY, STAGES } from "../lib/constants.ts";
import { validLines } from "../lib/estimates.ts";

export const SNAPSHOT_KEY = "as_shop_v2";
export type ShopSnapshot = {
  version: 2;
  accounts: Account[];
  laborRate: number;
  vehicles: Vehicle[];
  requests: ServiceRequest[];
  appointments: Appointment[];
  parts: Part[];
  invoices: Invoice[];
  users: AppUser[];
  technicians: Technician[];
  specialties: string[];
  assignments: ServiceAssignment[];
  notifications: AppNotification[];
  timeLogs: TimeLogEntry[];
  partRequests: PartRequest[];
};

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: RecordValue, keys: string[]) => keys.every((key) => typeof value[key] === "string");
const optionalStrings = (value: RecordValue, keys: string[]) => keys.every((key) => value[key] === undefined || typeof value[key] === "string");
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const numbers = (value: RecordValue, keys: string[]) => keys.every((key) => positive(value[key]));
const member = (value: unknown, options: readonly string[]) => typeof value === "string" && options.includes(value);
const stringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
const services = (value: unknown) => value === undefined || (stringList(value) && value.length > 0);

function collection(value: unknown, shape: (row: RecordValue) => boolean) {
  if (!Array.isArray(value)) return false;
  return value.every((row) => record(row) && typeof row.id === "string" && row.id.length > 0 && shape(row)) &&
    new Set(value.map((row: RecordValue) => row.id)).size === value.length;
}

function snapshotShape(value: unknown): value is ShopSnapshot {
  if (!record(value) || value.version !== 2 || !positive(value.laborRate) || !stringList(value.specialties)) return false;
  const shapes: Record<string, (row: RecordValue) => boolean> = {
    accounts: (a) => strings(a, ["name", "email", "phone"]) && Array.isArray(a.roles) && a.roles.length > 0 && a.roles.every((role) => member(role, ROLE_PRIORITY)),
    vehicles: (v) => strings(v, ["make", "model", "vin", "plate", "color", "image", "customerId"]) && numbers(v, ["year", "mileage"]),
    requests: (r) => strings(r, ["vehicleId", "serviceType", "description", "createdAt", "preferredDate", "preferredTime"]) && member(r.stage, STAGES) &&
      optionalStrings(r, ["technicianId", "diagnosis", "concern", "exteriorCondition", "interiorCondition", "checkInNotes"]) &&
      (r.mileageIn === undefined || positive(r.mileageIn)) && numbers(r, ["total"]) && services(r.services) &&
      collection(r.repairs, (l) => strings(l, ["item"]) && member(l.type, ["Part", "Labor"]) && numbers(l, ["cost"]) &&
        optionalStrings(l, ["partId"]) && (l.qty === undefined || positive(l.qty)) && (l.hours === undefined || positive(l.hours)) &&
        (l.approved === undefined || typeof l.approved === "boolean")) &&
      Array.isArray(r.timeline) && r.timeline.every((entry) => record(entry) && strings(entry, ["at", "label"]) &&
        member(entry.kind, ["info", "warn", "ok"]) && optionalStrings(entry, ["by", "role", "note", "stage"])),
    appointments: (a) => strings(a, ["vehicleId", "serviceType", "date", "time"]) && services(a.services) && optionalStrings(a, ["requestId"]) && member(a.status, ["Scheduled", "Completed", "Cancelled"]),
    parts: (p) => strings(p, ["name", "number", "category"]) && numbers(p, ["quantity", "price"]) && Number.isInteger(p.quantity),
    invoices: (i) => strings(i, ["requestId", "vehicleId", "date"]) && positive(i.taxRate) && i.taxRate <= 1 && member(i.status, ["Paid", "Unpaid", "Overdue"]),
    users: (u) => strings(u, ["name", "email", "phone"]) && member(u.role, ["Customer", "Technician", "Service Manager", "Admin"]) && member(u.status, ["Active", "Invited", "Suspended"]),
    technicians: (t) => strings(t, ["name", "email"]) && optionalStrings(t, ["phone"]) && numbers(t, ["activeJobs", "completed"]) && member(t.status, ["Available", "Busy", "Off"]) && stringList(t.specialties),
    assignments: (a) => strings(a, ["requestId", "technicianId", "assignedAt", "notes"]) && member(a.status, ["Assigned", "In Progress", "On Hold", "Completed"]) &&
      optionalStrings(a, ["holdReason"]) && (a.resumeStatus === undefined || member(a.resumeStatus, ["Assigned", "In Progress"])),
    notifications: (n) => strings(n, ["text", "at"]) && optionalStrings(n, ["accountId"]) && typeof n.read === "boolean" && member(n.kind, ["ok", "info", "warn", "bell"]) &&
      (n.roles === undefined || (Array.isArray(n.roles) && n.roles.every((role) => member(role, ROLE_PRIORITY)))),
    timeLogs: (t) => strings(t, ["requestId", "technicianId", "vehicle", "task", "date"]) && positive(t.hours) && t.hours > 0 && t.hours <= 16,
    partRequests: (p) => strings(p, ["requestId", "technicianId", "partId", "at", "note"]) && optionalStrings(p, ["resolvedBy"]) && positive(p.qty) && Number.isInteger(p.qty) && p.qty > 0 && member(p.status, ["Pending", "Issued", "Rejected"]),
  };
  return Object.entries(shapes).every(([key, shape]) => collection(value[key], shape));
}

export function parseSnapshot(raw: string): ShopSnapshot | null {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  if (record(data) && Array.isArray(data.requests)) {
    const stages: Record<string,string> = {Requested:"Service Requested", "Checked In":"Vehicle Checked In", Diagnosed:"Diagnosis", "Pending Admin Review":"Customer Approval", "Awaiting Customer Approval":"Customer Approval", "In Repair":"Repair"};
    data.requests = data.requests.map(row => {
      if (!record(row)) return row;
      return {...row, stage: stages[String(row.stage)] ?? row.stage,
        timeline: Array.isArray(row.timeline) ? row.timeline.map(entry => record(entry) ? {...entry,stage: stages[String(entry.stage)] ?? entry.stage} : entry) : row.timeline};
    });
    if (Array.isArray(data.technicians)) data.technicians = data.technicians.map(row => {if (!record(row))return row;const {rating, ...remaining}=row;return remaining;});
  }
  if (!snapshotShape(data)) return null;
  const accounts = new Set(data.accounts.map((a) => a.id));
  if (new Set(data.accounts.map((a) => a.email.toLowerCase())).size !== data.accounts.length) return null;
  const vehicles = new Map(data.vehicles.map((v) => [v.id, v]));
  const requests = new Map(data.requests.map((r) => [r.id, r]));
  const technicians = new Set(data.technicians.map((t) => t.id));
  const parts = new Set(data.parts.map((p) => p.id));
  if (!data.vehicles.every((v) => accounts.has(v.customerId))) return null;
  if (!data.requests.every((r) => vehicles.has(r.vehicleId) && (!r.technicianId || technicians.has(r.technicianId)) && validLines(r.repairs, data.parts, data.laborRate))) return null;
  if (!data.assignments.every((a) => requests.get(a.requestId)?.technicianId === a.technicianId && technicians.has(a.technicianId)) ||
      new Set(data.assignments.map((a) => a.requestId)).size !== data.assignments.length) return null;
  if (!data.invoices.every((i) => requests.get(i.requestId)?.vehicleId === i.vehicleId)) return null;
  if (!data.appointments.every((a) => vehicles.has(a.vehicleId) && (!a.requestId || requests.get(a.requestId)?.vehicleId === a.vehicleId))) return null;
  if (!data.timeLogs.every((t) => requests.has(t.requestId) && technicians.has(t.technicianId))) return null;
  if (!data.partRequests.every((p) => requests.has(p.requestId) && parts.has(p.partId) && technicians.has(p.technicianId))) return null;
  return data;
}

export function restoreShop(): { snapshot: ShopSnapshot | null; warning: string } {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return { snapshot: null, warning: "" };
    const snapshot = parseSnapshot(raw);
    return { snapshot, warning: snapshot ? "" : "Saved demo data was invalid. The sample shop has been restored." };
  } catch {
    return { snapshot: null, warning: "Session storage is unavailable. Changes may not survive refresh." };
  }
}
