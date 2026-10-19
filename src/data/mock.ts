export type Role = "customer" | "technician" | "admin";

// Sample dates are relative to today so dashboards, date filters and Upcoming/Past look current.
export const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const stamp = (n: number, time: string) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${time}`;
};

/** Login directory: resolves an email/phone to a display name and the roles the account may access. */
export type Account = { id?: string; name: string; email: string; phone: string; roles: Role[] };

export const accounts: Account[] = [
  { name: "John Doe", email: "john@example.com", phone: "(415) 555-0132", roles: ["customer"] },
  { name: "Mike Johnson", email: "mike@example.com", phone: "(415) 555-0177", roles: ["technician"] },
  { name: "Admin User", email: "admin@example.com", phone: "(415) 555-0100", roles: ["admin"] },
  // Multi-role accounts — permissions from all roles are combined after sign-in.
  { name: "Sarah Williams", email: "sarah@example.com", phone: "(415) 555-0198", roles: ["admin", "technician"] },
  { name: "David Park", email: "david@example.com", phone: "(415) 555-0166", roles: ["technician", "customer"] },
];

export type RepairStage =
  | "Requested"
  | "Checked In"
  | "Diagnosed"
  | "Pending Admin Review"
  | "Awaiting Customer Approval"
  | "In Repair"
  | "Completed";

export const STAGES: RepairStage[] = [
  "Requested",
  "Checked In",
  "Diagnosed",
  "Pending Admin Review",
  "Awaiting Customer Approval",
  "In Repair",
  "Completed",
];

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

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=320&h=200&fit=crop&auto=format`;

export const vehicles: Vehicle[] = [
  {
    id: "v1",
    customerId: "u1",
    make: "Toyota",
    model: "Camry",
    year: 2018,
    vin: "4T1B11HK8JU123456",
    mileage: 45230,
    plate: "8XYZ204",
    color: "Silver",
    image: img("photo-1621007947382-bb3c3994e3fb"),
  },
  {
    id: "v2",
    customerId: "u1",
    make: "Honda",
    model: "Accord",
    year: 2020,
    vin: "1HGCV1F30LA123456",
    mileage: 32400,
    plate: "6ABC318",
    color: "Black",
    image: img("photo-1606152421802-db97b9c7a11b"),
  },
  {
    id: "v3",
    customerId: "u1",
    make: "Hyundai",
    model: "Elantra",
    year: 2019,
    vin: "KMHD74LF5KU987654",
    mileage: 26100,
    plate: "5DEF110",
    color: "White",
    image: img("photo-1552519507-da3b142c6e3d"),
  },
];

export const serviceRequests: ServiceRequest[] = [
  {
    id: "SR10023",
    vehicleId: "v1",
    serviceType: "Brake Service",
    description: "Strange noise when braking.",
    concern: "Strange noise when braking.",
    stage: "In Repair",
    createdAt: dayOffset(-8),
    preferredDate: dayOffset(-8),
    preferredTime: "10:00 AM",
    technicianId: "t1",
    diagnosis: "Front brake pads are worn out. Rotors need resurfacing.",
    mileageIn: 45230,
    exteriorCondition: "Good",
    interiorCondition: "Good",
    checkInNotes: "The car makes a strange noise when braking.",
    repairs: [
      { id: "r1", item: "Brake Pads (Front)", type: "Part", cost: 120, approved: true },
      { id: "r2", item: "Rotor Resurfacing", type: "Labor", cost: 80, approved: true },
      { id: "r3", item: "Brake Fluid Flush", type: "Labor", cost: 50, approved: true },
    ],
    timeline: [
      { at: stamp(-8, "09:15 AM"), label: "Service request submitted", kind: "info" },
      { at: stamp(-8, "10:05 AM"), label: "Vehicle checked in", kind: "info" },
      { at: stamp(-8, "11:40 AM"), label: "Diagnosis completed", kind: "info" },
      { at: stamp(-8, "01:10 PM"), label: "Estimate reviewed — sent for customer approval", kind: "info", by: "Sarah Williams", role: "Admin", stage: "Awaiting Customer Approval" },
      { at: stamp(-8, "04:20 PM"), label: "Customer approved the repairs", kind: "ok", by: "John Doe", role: "Customer", stage: "In Repair" },
      { at: stamp(-7, "09:30 AM"), label: "Repair work started", kind: "info" },
    ],
    total: 250,
  },
  {
    id: "SR10022",
    vehicleId: "v2",
    serviceType: "Oil Change",
    description: "Routine oil change and inspection.",
    concern: "Routine maintenance.",
    stage: "Awaiting Customer Approval",
    createdAt: dayOffset(-6),
    preferredDate: dayOffset(-6),
    preferredTime: "02:00 PM",
    technicianId: "t1",
    diagnosis: "Air filter clogged, recommend replacement.",
    mileageIn: 32400,
    exteriorCondition: "Excellent",
    interiorCondition: "Good",
    repairs: [
      { id: "r4", item: "Synthetic Oil Change", type: "Labor", cost: 60 },
      { id: "r5", item: "Air Filter", type: "Part", cost: 25 },
    ],
    timeline: [
      { at: stamp(-6, "08:30 AM"), label: "Service request submitted", kind: "info" },
      { at: stamp(-6, "09:10 AM"), label: "Vehicle checked in", kind: "info" },
      { at: stamp(-6, "10:45 AM"), label: "Diagnosis completed", kind: "info", by: "Mike Johnson", role: "Technician" },
      { at: stamp(-6, "11:05 AM"), label: "Estimate submitted for admin review", kind: "info", by: "Mike Johnson", role: "Technician", stage: "Pending Admin Review" },
      { at: stamp(-6, "01:20 PM"), label: "Estimate reviewed — sent for customer approval", kind: "warn", by: "Sarah Williams", role: "Admin", stage: "Awaiting Customer Approval" },
    ],
    total: 650,
  },
  {
    id: "SR10024",
    vehicleId: "v3",
    serviceType: "AC Service",
    description: "AC not cooling properly.",
    concern: "AC blows warm air.",
    stage: "Diagnosed",
    createdAt: dayOffset(-4),
    preferredDate: dayOffset(-3),
    preferredTime: "11:00 AM",
    technicianId: "t1",
    diagnosis: "Refrigerant low, compressor functional. Recharge recommended.",
    mileageIn: 26100,
    exteriorCondition: "Good",
    interiorCondition: "Excellent",
    repairs: [{ id: "r6", item: "AC Recharge", type: "Labor", cost: 90 }],
    timeline: [
      { at: stamp(-4, "01:15 PM"), label: "Service request submitted", kind: "info" },
      { at: stamp(-4, "02:05 PM"), label: "Vehicle checked in", kind: "info" },
      { at: stamp(-4, "03:30 PM"), label: "Diagnosis completed", kind: "info" },
    ],
    total: 90,
  },
  {
    id: "SR10021",
    vehicleId: "v3",
    serviceType: "Tire Rotation",
    description: "Rotate tires and balance.",
    concern: "Uneven tire wear.",
    stage: "Completed",
    createdAt: dayOffset(-14),
    preferredDate: dayOffset(-14),
    preferredTime: "09:00 AM",
    technicianId: "t1",
    diagnosis: "Tires rotated and balanced. No further issues.",
    repairs: [{ id: "r7", item: "Tire Rotation & Balance", type: "Labor", cost: 40 }],
    timeline: [
      { at: stamp(-14, "09:00 AM"), label: "Service request submitted", kind: "info" },
      { at: stamp(-14, "09:30 AM"), label: "Vehicle checked in", kind: "info" },
      { at: stamp(-14, "11:00 AM"), label: "Repair completed", kind: "ok" },
    ],
    total: 150,
  },
];

export const appointments: Appointment[] = [
  { id: "a1", vehicleId: "v1", serviceType: "General Service", date: dayOffset(3), time: "10:00 AM", status: "Scheduled", requestId: "SR10023" },
  { id: "a2", vehicleId: "v2", serviceType: "Brake Inspection", date: dayOffset(8), time: "02:00 PM", status: "Scheduled", requestId: "SR10022" },
  { id: "a3", vehicleId: "v3", serviceType: "AC Service", date: dayOffset(14), time: "11:00 AM", status: "Scheduled", requestId: "SR10024" },
  { id: "a4", vehicleId: "v1", serviceType: "Oil Change", date: dayOffset(-20), time: "09:00 AM", status: "Completed", requestId: "SR10023" },
  { id: "a5", vehicleId: "v3", serviceType: "Tire Rotation", date: dayOffset(-35), time: "03:00 PM", status: "Completed", requestId: "SR10021" },
];

export const parts: Part[] = [
  { id: "p1", name: "Brake Pads (Front)", number: "BP-1001", quantity: 25, price: 40, category: "Brakes" },
  { id: "p2", name: "Oil Filter", number: "OF-2002", quantity: 40, price: 8, category: "Engine" },
  { id: "p3", name: "Brake Fluid", number: "BF-3003", quantity: 30, price: 6, category: "Fluids" },
  { id: "p4", name: "Air Filter", number: "AF-4004", quantity: 15, price: 15, category: "Engine" },
  { id: "p5", name: "Spark Plug", number: "SP-5005", quantity: 50, price: 4, category: "Engine" },
  { id: "p6", name: "Cabin Filter", number: "CF-6006", quantity: 8, price: 18, category: "HVAC" },
  { id: "p7", name: "Wiper Blade", number: "WB-7007", quantity: 22, price: 12, category: "Exterior" },
];

export const invoices: Invoice[] = [
  { id: "INV10023", requestId: "SR10023", vehicleId: "v1", date: dayOffset(-4), status: "Paid", taxRate: 0.08 },
  { id: "INV10021", requestId: "SR10021", vehicleId: "v3", date: dayOffset(-13), status: "Paid", taxRate: 0.08 },
  { id: "INV10018", requestId: "SR10022", vehicleId: "v2", date: dayOffset(-18), status: "Unpaid", taxRate: 0.08 },
];

export const users: AppUser[] = [
  { id: "u1", name: "John Doe", email: "john@example.com", role: "Customer", status: "Active", phone: "(415) 555-0132" },
  { id: "u2", name: "Mike Johnson", email: "mike@example.com", role: "Technician", status: "Active", phone: "(415) 555-0177" },
  { id: "u3", name: "Sarah Williams", email: "sarah@example.com", role: "Service Manager", status: "Active", phone: "(415) 555-0198" },
  { id: "u4", name: "Admin User", email: "admin@example.com", role: "Admin", status: "Active", phone: "(415) 555-0100" },
  { id: "u5", name: "Emily Chen", email: "emily@example.com", role: "Customer", status: "Invited", phone: "(415) 555-0144" },
  { id: "u6", name: "David Park", email: "david@example.com", role: "Technician", status: "Active", phone: "(415) 555-0166" },
];

export const specialties: string[] = [
  "Brakes", "Suspension", "Engine", "Diagnostics", "Electrical", "AC", "Transmission", "General Service",
];

export const technicians: Technician[] = [
  { id: "t1", name: "Mike Johnson", email: "mike@example.com", specialties: ["Brakes", "Suspension"], activeJobs: 3, completed: 142, rating: 4.9, status: "Busy" },
  { id: "t2", name: "David Park", email: "david@example.com", specialties: ["Engine", "Diagnostics"], activeJobs: 2, completed: 98, rating: 4.7, status: "Available" },
  { id: "t3", name: "Luis Ramirez", email: "luis@example.com", specialties: ["Electrical", "AC"], activeJobs: 1, completed: 76, rating: 4.8, status: "Available" },
  { id: "t5", name: "Sarah Williams", email: "sarah@example.com", specialties: ["Diagnostics"], activeJobs: 0, completed: 12, rating: 4.8, status: "Available" },
  { id: "t4", name: "Anna Kim", email: "anna@example.com", specialties: ["Transmission"], activeJobs: 0, completed: 54, rating: 4.6, status: "Off" },
];

export const assignments: ServiceAssignment[] = [
  { id: "as1", technicianId: "t1", requestId: "SR10023", status: "In Progress", assignedAt: dayOffset(-8), notes: "Front brakes priority." },
  { id: "as2", technicianId: "t1", requestId: "SR10022", status: "Assigned", assignedAt: dayOffset(-6), notes: "" },
  { id: "as3", technicianId: "t1", requestId: "SR10021", status: "Completed", assignedAt: dayOffset(-15), notes: "Tire rotation done." },
  { id: "as4", technicianId: "t1", requestId: "SR10024", status: "In Progress", assignedAt: dayOffset(-4), notes: "" },
];

export const notifications: AppNotification[] = [
  { id: "n1", kind: "bell", text: `Your appointment on ${dayOffset(3)} at 10:00 AM is confirmed.`, at: stamp(-2, "09:00 AM"), read: false },
  { id: "n2", kind: "ok", text: "Your vehicle diagnosis is ready for review.", at: stamp(-6, "03:45 PM"), read: false },
  { id: "n3", kind: "info", text: "Your repairs have been approved.", at: stamp(-8, "05:00 PM"), read: true },
  { id: "n4", kind: "warn", text: "Your vehicle repair is in progress.", at: stamp(-7, "10:20 AM"), read: true },
  { id: "n5", kind: "ok", text: "Your vehicle repair is completed.", at: stamp(-4, "02:30 PM"), read: true },
];

export const timeLogs: TimeLogEntry[] = [
  { id: "tl1", requestId: "SR10023", vehicle: "Toyota Camry 2018", task: "Brake pad replacement", date: dayOffset(-7), hours: 2.5, technicianId: "t1" },
  { id: "tl2", requestId: "SR10023", vehicle: "Toyota Camry 2018", task: "Rotor resurfacing", date: dayOffset(-7), hours: 1.5, technicianId: "t1" },
  { id: "tl3", requestId: "SR10022", vehicle: "Honda Accord 2020", task: "Diagnosis & inspection", date: dayOffset(-6), hours: 1.0, technicianId: "t1" },
  { id: "tl4", requestId: "SR10024", vehicle: "Hyundai Elantra 2019", task: "AC system diagnosis", date: dayOffset(-4), hours: 1.5, technicianId: "t1" },
  // Current-week entries
  { id: "tl5", requestId: "SR10023", vehicle: "Toyota Camry 2018", task: "Brake fluid flush", date: dayOffset(-2), hours: 1.0, technicianId: "t1" },
  { id: "tl6", requestId: "SR10024", vehicle: "Hyundai Elantra 2019", task: "AC leak test", date: dayOffset(-1), hours: 2.0, technicianId: "t1" },
  { id: "tl7", requestId: "SR10023", vehicle: "Toyota Camry 2018", task: "Road test & QA", date: dayOffset(0), hours: 0.5, technicianId: "t1" },
  { id: "tl8", requestId: "SR10022", vehicle: "Honda Accord 2020", task: "Second opinion — air intake", date: dayOffset(-1), hours: 1.5, technicianId: "t2" },
];

export const revenueSeries = [
  { month: "Jan", value: 3200 },
  { month: "Feb", value: 4100 },
  { month: "Mar", value: 3800 },
  { month: "Apr", value: 4600 },
  { month: "May", value: 5230 },
];

export const requestsSeries = [
  { label: "Mon", value: 8 },
  { label: "Tue", value: 5 },
  { label: "Wed", value: 11 },
  { label: "Thu", value: 6 },
  { label: "Fri", value: 9 },
  { label: "Sat", value: 4 },
];

export const serviceTypes = [
  "General Service",
  "Oil Change",
  "Brake Service",
  "Brake Inspection",
  "AC Service",
  "Tire Rotation",
  "Engine Diagnostics",
  "Battery Replacement",
  "Transmission Service",
];

export const partRequests: PartRequest[] = [
  { id: "pr1", requestId: "SR10023", partId: "p1", qty: 1, technicianId: "t1", status: "Issued", at: stamp(-7, "09:40 AM"), note: "Front pads", resolvedBy: "Sarah Williams" },
  { id: "pr2", requestId: "SR10024", partId: "p2", qty: 1, technicianId: "t1", status: "Pending", at: stamp(-1, "02:15 PM"), note: "" },
];

/** Default shop labor rate ($/hour). Admin-managed. */
export const LABOR_RATE = 100;


// Additive demo accounts and linked work across each workflow stage.
const demoCustomers = [
  ["Nora Ellis", "nora.ellis@example.com", "Mazda", "CX-5", "Blue"],
  ["Owen Brooks", "owen.brooks@example.com", "Subaru", "Outback", "Green"],
  ["Priya Shah", "priya.shah@example.com", "Kia", "Sportage", "White"],
  ["Caleb Reed", "caleb.reed@example.com", "Ford", "Escape", "Gray"],
  ["Maya Torres", "maya.torres@example.com", "Nissan", "Altima", "Silver"],
  ["Ethan Cole", "ethan.cole@example.com", "Volkswagen", "Golf", "Black"],
];
demoCustomers.forEach(([name, email, make, model, color], i) => {
  const id = `u-demo-${i + 1}`;
  const phone = `(415) 555-02${String(i + 1).padStart(2, "0")}`;
  users.push({ id, name, email, phone, role: "Customer", status: "Active" });
  accounts.push({ id, name, email, phone, roles: ["customer"] });
  vehicles.push({ id: `v-demo-${i + 1}`, customerId: id, make, model, color, year: 2020 + i % 4, vin: `DEMOAUTO${String(i + 1).padStart(9, "0")}`, mileage: 28000 + i * 5300, plate: `DEMO${i + 1}`, image: vehicles[i % 3].image });
});
accounts.forEach((a) => { a.id ??= users.find((u) => u.email.toLowerCase() === a.email.toLowerCase())?.id ?? `account-${a.email.toLowerCase()}`; });
notifications.forEach((n) => { n.accountId = "u1"; });
const demoStages: RepairStage[] = ["Requested", "Checked In", "Diagnosed", "Pending Admin Review", "Awaiting Customer Approval", "In Repair", "Completed", "In Repair"];
demoStages.forEach((stage, i) => {
  const id = `SR200${String(i + 1).padStart(2, "0")}`;
  const vehicleId = `v-demo-${i % 6 + 1}`;
  const customer = demoCustomers[i % 6][0];
  const technicianId = i >= 2 ? (i % 2 ? "t2" : "t1") : undefined;
  const approved = i >= 5;
  const repairs: RepairLine[] = i >= 2 ? [
    { id: `${id}-part`, item: "Air Filter", type: "Part", partId: "p4", qty: 1, cost: 15, approved: approved ? true : undefined },
    { id: `${id}-labor`, item: "Intake inspection and filter replacement", type: "Labor", hours: 0.75, cost: 75, approved: approved ? true : undefined },
  ] : [];
  const timeline: TimelineEntry[] = [{ at: stamp(-3, "09:00 AM"), label: "Service request submitted", kind: "info", by: customer, role: "Customer", stage: "Requested" }];
  if (i >= 1) timeline.push({ at: stamp(-3, "09:30 AM"), label: "Vehicle checked in", kind: "info", by: customer, role: "Customer", stage: "Checked In" });
  if (i >= 2) timeline.push({ at: stamp(-3, "10:00 AM"), label: "Diagnosis recorded", kind: "info", by: technicianId === "t1" ? "Mike Johnson" : "David Park", role: "Technician", stage: "Diagnosed" });
  if (i >= 3) timeline.push({ at: stamp(-3, "11:00 AM"), label: "Estimate submitted for admin review", kind: "info", by: technicianId === "t1" ? "Mike Johnson" : "David Park", role: "Technician", stage: "Pending Admin Review" });
  if (i >= 4) timeline.push({ at: stamp(-2, "09:00 AM"), label: "Estimate reviewed — sent for customer approval", kind: "warn", by: "Admin User", role: "Admin", stage: "Awaiting Customer Approval" });
  if (approved) timeline.push({ at: stamp(-2, "10:00 AM"), label: "Customer approved the repairs", kind: "ok", by: customer, role: "Customer", stage: "In Repair" });
  if (stage === "Completed") timeline.push({ at: stamp(-1, "02:00 PM"), label: "Repair completed", kind: "ok", by: "Mike Johnson", role: "Technician", stage: "Completed" });
  if (i === 7) timeline.push({ at: stamp(-1, "11:00 AM"), label: "Assignment placed on hold", kind: "warn", by: "David Park", role: "Technician", note: "Waiting for replacement intake housing delivery." });
  serviceRequests.push({ id, vehicleId, serviceType: "Engine Diagnostics", description: "Rough idle and reduced fuel economy.", concern: "Rough idle and reduced fuel economy.", stage, createdAt: dayOffset(-3), preferredDate: dayOffset(i < 2 ? 2 : -3), preferredTime: "10:00 AM", technicianId, diagnosis: i >= 2 ? "Clogged intake filter; replace and inspect intake seals." : undefined, repairs, timeline, total: repairs.length ? 90 : 0 });
  if (technicianId) assignments.push({ id: `as-demo-${i + 1}`, requestId: id, technicianId, status: i === 7 ? "On Hold" : stage === "Completed" ? "Completed" : stage === "In Repair" ? "In Progress" : "Assigned", assignedAt: dayOffset(-3), notes: "", ...(i === 7 ? { resumeStatus: "In Progress" as const, holdReason: "Waiting for replacement intake housing delivery." } : {}) });
  if (stage === "Completed") invoices.push({ id: "INV20007", requestId: id, vehicleId, date: dayOffset(-1), status: "Paid", taxRate: 0.08 });
  if (i < 2 || stage === "Completed") appointments.push({ id: `a-demo-${i + 1}`, requestId: id, vehicleId, serviceType: "Engine Diagnostics", date: dayOffset(i < 2 ? 2 : -3), time: "10:00 AM", status: stage === "Completed" ? "Completed" : "Scheduled" });
});
