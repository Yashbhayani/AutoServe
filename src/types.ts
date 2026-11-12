export type Role = "customer" | "technician" | "admin";


export type Account = { id: string; name: string; email: string; phone: string; roles: Role[] };


export type RepairStage =
  | "Requested"
  | "Checked In"
  | "Diagnosed"
  | "Pending Admin Review"
  | "Awaiting Customer Approval"
  | "In Repair"
  | "Completed";


export type Vehicle = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  plate: string;
  color: string;
  image: string;
};


export type RepairLine = {
  id: string;
  item: string;
  type: "Part" | "Labor";
  /** Computed price. For inventory parts = qty × unit price; for labor = hours × labor rate. */
  cost: number;
  approved?: boolean;
  /** Inventory part (price comes from inventory, never from the technician). */
  partId?: string;
  qty?: number;
  /** Labor hours (price comes from the admin-managed labor rate). */
  hours?: number;
};


export type TimelineEntry = {
  at: string;
  label: string;
  kind: "info" | "ok" | "warn";
  /** Who performed the step, and in which capacity. */
  by?: string;
  role?: string;
  note?: string;
  /** Work-progress stage after this step, if it changed. */
  stage?: string;
};


export type ServiceRequest = {
  id: string;
  vehicleId: string;
  serviceType: string;
  /** Selected services; older demo records retain their single serviceType. */
  services?: string[];
  description: string;
  stage: RepairStage;
  createdAt: string;
  preferredDate: string;
  preferredTime: string;
  technicianId?: string;
  diagnosis?: string;
  concern?: string;
  mileageIn?: number;
  exteriorCondition?: string;
  interiorCondition?: string;
  checkInNotes?: string;
  repairs: RepairLine[];
  timeline: TimelineEntry[];
  total: number;
};


export type Appointment = {
  id: string;
  vehicleId: string;
  serviceType: string;
  services?: string[];
  date: string;
  time: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  /** Related service request, if any. */
  requestId?: string;
};


export type Part = {
  id: string;
  name: string;
  number: string;
  quantity: number;
  price: number;
  category: string;
};


export type Invoice = {
  id: string;
  requestId: string;
  vehicleId: string;
  date: string;
  status: "Paid" | "Unpaid" | "Overdue";
  taxRate: number;
};


export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "Customer" | "Technician" | "Service Manager" | "Admin";
  status: "Active" | "Invited" | "Suspended";
  phone: string;
};


export type Technician = {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  activeJobs: number;
  completed: number;
  rating: number;
  status: "Available" | "Busy" | "Off";
  phone?: string;
};


export type AssignmentStatus = "Assigned" | "In Progress" | "On Hold" | "Completed";
export type ServiceAssignment = {
  id: string;
  technicianId: string;
  requestId: string;
  status: AssignmentStatus;
  assignedAt: string;
  notes: string;
  holdReason?: string;
  resumeStatus?: "Assigned" | "In Progress";
};


export type AppNotification = {
  accountId?: string;
  roles?: Role[];
  id: string;
  kind: "ok" | "info" | "warn" | "bell";
  text: string;
  at: string;
  read: boolean;
};


export type TimeLogEntry = {
  id: string;
  requestId: string;
  vehicle: string;
  task: string;
  date: string;
  hours: number;
  technicianId: string;
};


export type PartRequest = {
  id: string;
  requestId: string;
  partId: string;
  qty: number;
  technicianId: string;
  status: "Pending" | "Issued" | "Rejected";
  at: string;
  note: string;
  resolvedBy?: string;
};

