import type { RepairStage, Role } from "../types";

export const ROLE_PRIORITY: Role[] = ["admin", "technician", "customer"];
export const STAGES: RepairStage[] = ["Service Requested", "Vehicle Checked In", "Diagnosis", "Customer Approval", "Repair", "Completed"];
export const STAGE_COLORS: Record<RepairStage, string> = {
  "Service Requested": "#94a3b8", "Vehicle Checked In": "#64748b", Diagnosis: "#0ea5e9",
  "Customer Approval": "#d97706", Repair: "#2563eb", Completed: "#16a34a",
};
