export type Role = "customer" | "technician" | "admin";


export type Account = { id: string; name: string; email: string; phone: string; roles: Role[] };


export type RepairStage =
  | "Service Requested"
  | "Vehicle Checked In"
  | "Diagnosis"
  | "Customer Approval"
  | "Repair"
  | "Completed";
