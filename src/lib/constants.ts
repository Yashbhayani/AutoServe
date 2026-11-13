import type { RepairStage, Role } from "../types";

export const ROLE_PRIORITY: Role[] = ["admin", "technician", "customer"];
export const STAGES: RepairStage[] = ["Service Requested", "Vehicle Checked In", "Diagnosis", "Customer Approval", "Repair", "Completed"];
export const STAGE_COLORS: Record<RepairStage, string> = {
  "Service Requested": "#94a3b8", "Vehicle Checked In": "#64748b", Diagnosis: "#0ea5e9",
  "Customer Approval": "#d97706", Repair: "#2563eb", Completed: "#16a34a",
};
export const APPOINTMENT_TIMES = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];
export const serviceTypes = ["General Service", "Oil Change", "Brake Service", "Brake Inspection", "AC Service", "Tire Rotation", "Engine Diagnostics", "Battery Replacement", "Transmission Service"];
export const LABOR_RATE = 100;
