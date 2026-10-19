import { useState } from "react";
import { Link, matchPath, useLogicalPath, useNavigate } from "../router";
import { useCustomerApp, vehicleLabel } from "../store/AppContext";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Label,
  Menu,
  MenuItem,
  Modal,
  PageHeader,
  Select,
  StageTracker,
  StatCard,
  StatusBadge,
  Table,
  useTableData,
  TableSearch,
  Pagination,
  NoRows,
  Tabs,
  Td,
  Textarea,
  Thead,
  Timeline,
  Tr,
  money,
  money0,
} from "../components/ui";
import {
  IconCar,
  IconCalendar,
  IconClipboard,
  IconInvoice,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDownload,
  IconPrinter,
  IconCheck,
  IconBell,
  IconWrench,
  IconX,
  IconChevronDown,
} from "../components/icons";
import { EstimateTable } from "../components/workflow";
import { STAGES, accounts, serviceTypes, type Role, type Vehicle } from "../data/mock";

/* ============ Dashboard ============ */
export function CustomerDashboard() {
  const { vehicles, requests, appointments, userName } = useCustomerApp();
  const active = requests.filter((r) => r.stage !== "Completed").length;
  const upcoming = appointments.filter((a) => a.status === "Scheduled").length;
  const spent = requests.filter((r) => r.stage === "Completed").reduce((a, b) => a + b.total, 0);

  return (
    <>
      <PageHeader title={`Welcome, ${userName ?? ""}`} subtitle="Here's what's happening with your vehicles." />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard icon={<IconCar />} label="Vehicles" value={vehicles.length} sub="Registered" />
        <StatCard icon={<IconWrench />} label="Active Service" value={active} sub="In progress" tone="warn" />
        <StatCard icon={<IconCalendar />} label="Appointments" value={upcoming} sub="Upcoming" tone="ok" />
        <StatCard icon={<IconInvoice />} label="Total Spent" value={money0(spent)} sub="All time" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Service Requests"
            action={<Link to="/customer/requests" className="text-[13px] font-medium text-brand-600 hover:underline">View all</Link>}
          />
          <Table>
            <Thead cols={["Request ID", "Vehicle", "Status", "Date", "Total"]} />
            <tbody>
              {requests.slice(0, 4).map((r) => {
                const v = vehicles.find((x) => x.id === r.vehicleId);
                return (
                  <Tr key={r.id}>
                    <Td>
                      <Link to={`/customer/repair-status/${r.id}`} className="font-mono text-[13px] font-medium text-brand-600 hover:underline">
                        {r.id}
                      </Link>
                    </Td>
                    <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                    <Td><StatusBadge status={r.stage} /></Td>
                    <Td className="tabular">{r.createdAt}</Td>
                    <Td className="font-medium text-ink-900 tabular">{money0(r.total)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming Appointments"
            action={<Link to="/customer/appointments" className="text-[13px] font-medium text-brand-600 hover:underline">View all</Link>}
          />
          <div className="divide-y divide-line">
            {appointments.filter((a) => a.status === "Scheduled").slice(0, 3).map((a) => {
              const v = vehicles.find((x) => x.id === a.vehicleId);
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <IconCalendar />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{vehicleLabel(v)}</p>
                    <p className="text-[12px] text-ink-500">{a.serviceType}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[13px] font-semibold text-ink-900 tabular">{a.date}</p>
                    <p className="text-[12px] text-ink-400">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ============ My Vehicles ============ */
export function MyVehicles() {
  const { vehicles, removeVehicle } = useCustomerApp();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="My Vehicles"
        subtitle="Manage the vehicles registered to your account."
        action={
          <Button onClick={() => navigate("/customer/vehicles/new")}>
            <IconPlus size={16} /> Add Vehicle
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((v) => (
          <Card key={v.id} className="overflow-hidden">
            <div className="aspect-[16/9] w-full bg-slate-100">
              <img src={v.image} alt={vehicleLabel(v)} className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900">{vehicleLabel(v)}</h3>
                  <p className="mt-0.5 text-[12px] text-ink-400">{v.color} · Plate {v.plate}</p>
                </div>
                <Menu trigger={<span className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-slate-100">⋯</span>}>
                  <MenuItem onClick={() => navigate(`/customer/vehicles/${v.id}`)}><IconEdit size={16} /> Edit</MenuItem>
                  <MenuItem onClick={() => removeVehicle(v.id)}><IconTrash size={16} /> Remove</MenuItem>
                </Menu>
              </div>
              <dl className="mt-4 space-y-1.5 text-[13px]">
                <div className="flex justify-between"><dt className="text-ink-400">VIN</dt><dd className="font-mono text-ink-700">{v.vin}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-400">Mileage</dt><dd className="text-ink-700 tabular">{v.mileage.toLocaleString()} mi</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => navigate(`/customer/vehicles/${v.id}`)}>
                  <IconEdit size={15} /> Edit
                </Button>
                <Button size="sm" className="flex-1" onClick={() => navigate("/customer/requests/new")}>
                  Book Service
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ============ Add / Edit Vehicle ============ */
export function VehicleForm() {
  const pathname = useLogicalPath();
  const { vehicles, addVehicle, updateVehicle } = useCustomerApp();
  const navigate = useNavigate();
  const m = matchPath("/customer/vehicles/:id", pathname);
  const editing = m && m.params.id !== "new" ? vehicles.find((v) => v.id === m.params.id) : undefined;

  const [form, setForm] = useState<Omit<Vehicle, "id" | "customerId">>({
    make: editing?.make ?? "",
    model: editing?.model ?? "",
    year: editing?.year ?? new Date().getFullYear(),
    vin: editing?.vin ?? "",
    mileage: editing?.mileage ?? 0,
    plate: editing?.plate ?? "",
    color: editing?.color ?? "",
    image: editing?.image ?? "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=320&h=200&fit=crop&auto=format",
  });

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = editing ? updateVehicle({ ...form, id: editing.id, customerId: editing.customerId }) : addVehicle(form);
    if (!result.ok) return;
    navigate("/customer/vehicles");
  };

  if (m?.params.id !== "new" && !editing) return <Card><EmptyState icon={<IconCar />} title="Record not found" text="This record is unavailable for your account." /></Card>;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "My Vehicles", to: "/customer/vehicles" }, { label: editing ? "Edit Vehicle" : "Add Vehicle" }]}
        title={editing ? "Edit Vehicle" : "Add Vehicle"}
      />
      <Card className="max-w-2xl p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Make" required><Input value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" required /></Field>
            <Field label="Model" required><Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Camry" required /></Field>
            <Field label="Year" required><Input type="number" value={form.year} onChange={(e) => set("year", +e.target.value)} required /></Field>
            <Field label="Color"><Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Silver" /></Field>
            <Field label="VIN" required><Input value={form.vin} onChange={(e) => set("vin", e.target.value)} placeholder="4T1B11HK8JU123456" required /></Field>
            <Field label="License Plate"><Input value={form.plate} onChange={(e) => set("plate", e.target.value)} placeholder="8XYZ204" /></Field>
            <Field label="Mileage" required className="col-span-2">
              <Input type="number" value={form.mileage} onChange={(e) => set("mileage", +e.target.value)} required />
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" onClick={() => navigate("/customer/vehicles")}>Cancel</Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Vehicle"}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

/* ============ Service Requests list ============ */
export function CustomerRequests() {
  const { requests, vehicles } = useCustomerApp();
  const navigate = useNavigate();
  const t = useTableData(requests, (r) => [r.id, vehicleLabel(vehicles.find((x) => x.id === r.vehicleId)), r.serviceType, r.stage, r.createdAt, r.total].join(" "));
  return (
    <>
      <PageHeader
        title="Service Requests"
        subtitle="Track all of your service and repair requests."
        action={<Button onClick={() => navigate("/customer/requests/new")}><IconPlus size={16} /> New Request</Button>}
      />
      <Card>
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Request ID", "Vehicle", "Service", "Status", "Date", "Total", ""]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={7} />}
            {t.rows.map((r) => {
              const v = vehicles.find((x) => x.id === r.vehicleId);
              return (
                <Tr key={r.id}>
                  <Td><span className="font-mono text-[13px] font-medium text-brand-600">{r.id}</span></Td>
                  <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                  <Td>{r.serviceType}</Td>
                  <Td><StatusBadge status={r.stage} /></Td>
                  <Td className="tabular">{r.createdAt}</Td>
                  <Td className="font-medium text-ink-900 tabular">{money0(r.total)}</Td>
                  <Td>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/customer/repair-status/${r.id}`)}>Track</Button>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>
    </>
  );
}

/* ============ Create Service Request ============ */
export function CreateServiceRequest() {
  const { vehicles, createRequest } = useCustomerApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id ?? "",
    services: [] as string[],
    description: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [servicesError, setServicesError] = useState(false);
  const set = (k: Exclude<keyof typeof form, "services">, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleService = (service: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(service)
        ? f.services.filter((selected) => selected !== service)
        : [...f.services, service],
    }));
    setServicesError(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.services.length) {
      setServicesError(true);
      return;
    }
    const id = createRequest(form);
    if (!id) return;
    navigate(`/customer/repair-status/${id}`);
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Service Requests", to: "/customer/requests" }, { label: "New Request" }]}
        title="Create Service Request"
      />
      <Card className="max-w-2xl p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Vehicle" required>
            <Select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
            </Select>
          </Field>
          <Field label="Service Type" required>
            <div role="group" aria-label="Service Type (required)" aria-describedby="services-help" aria-invalid={servicesError} className="rounded-lg border border-line bg-white p-3">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {serviceTypes.map((service) => (
                  <Label key={service}>
                    <span className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        name="services"
                        value={service}
                        checked={form.services.includes(service)}
                        onChange={() => toggleService(service)}
                        className="size-4! shrink-0 accent-brand-500"
                      />
                      {service}
                    </span>
                  </Label>
                ))}
              </div>
              {form.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3" aria-label="Selected services">
                  {form.services.map((service) => (
                    <Button key={service} type="button" variant="secondary" size="sm" className="rounded-full text-brand-600" aria-label={`Remove ${service}`} onClick={() => toggleService(service)}>
                      {service}
                      <IconX size={14} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <p id="services-help" className={`mt-1 text-sm ${servicesError ? "text-bad-500" : "text-ink-400"}`} role={servicesError ? "alert" : undefined}>
              {servicesError ? "Select at least one service." : "Select one or more services for this request."}
            </p>
          </Field>
          <Field label="Issue Description" required>
            <Textarea
              rows={4}
              maxLength={500}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Please describe the issue in detail..."
              required
            />
            <p className="mt-1 text-right text-[12px] text-ink-400">{form.description.length}/500</p>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Preferred Date"><Input type="date" value={form.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} /></Field>
            <Field label="Preferred Time">
              <Select value={form.preferredTime} onChange={(e) => set("preferredTime", e.target.value)}>
                <option value="">Select Time</option>
                {["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <Button type="button" variant="secondary" onClick={() => navigate("/customer/requests")}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </Card>
    </>
  );
}

/* ============ Appointments ============ */
export function CustomerAppointments() {
  const { appointments, vehicles, addAppointment, rescheduleAppointment, cancelAppointment } = useCustomerApp();
  const [tab, setTab] = useState("Upcoming");
  const [newOpen, setNewOpen] = useState(false);
  const [resId, setResId] = useState<string | null>(null);

  const upcoming = appointments.filter((a) => a.status === "Scheduled");
  const past = appointments.filter((a) => a.status !== "Scheduled");
  const list = (tab === "Upcoming" ? upcoming : past).slice().sort((a, b) => (tab === "Upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

  const [na, setNa] = useState({ vehicleId: vehicles[0]?.id ?? "", services: [] as string[], date: "", time: "10:00 AM" });
  const [servicesOpen, setServicesOpen] = useState(false);
  const [servicesError, setServicesError] = useState(false);
  const toggleService = (service: string) => {
    setNa((a) => ({
      ...a,
      services: a.services.includes(service)
        ? a.services.filter((selected) => selected !== service)
        : [...a.services, service],
    }));
    setServicesError(false);
  };
  const bookAppointment = () => {
    if (!na.services.length) {
      setServicesError(true);
      setServicesOpen(true);
      return;
    }
    if (addAppointment({ ...na, serviceType: na.services.join(", ") }).ok) {
      setNewOpen(false);
      setServicesOpen(false);
      setServicesError(false);
      setNa({ vehicleId: vehicles[0]?.id ?? "", services: [], date: "", time: "10:00 AM" });
    }
  };
  const [res, setRes] = useState({ date: "", time: "10:00 AM" });

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="View and manage your scheduled service appointments."
        action={<Button onClick={() => setNewOpen(true)}><IconPlus size={16} /> New Appointment</Button>}
      />
      <div className="mb-5"><Tabs tabs={["Upcoming", "Past"]} active={tab} onChange={setTab} /></div>

      <div className="space-y-4">
        {list.length === 0 && (
          <Card><EmptyState icon={<IconCalendar />} title="No appointments" text="You have no appointments in this view." /></Card>
        )}
        {list.map((a) => {
          const v = vehicles.find((x) => x.id === a.vehicleId);
          const [mon, day] = new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit" }).split(" ");
          return (
            <Card key={a.id} className="flex flex-wrap items-center gap-4 p-5 sm:gap-5">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-navy-800 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">{mon}</span>
                <span className="text-xl font-bold leading-none">{day}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{vehicleLabel(v)}</p>
                <p className="text-sm text-ink-500">{a.serviceType}</p>
                <p className="mt-1 text-[13px] text-ink-400 tabular">
                  {a.time}
                  {a.requestId && (
                    <> · <Link to={`/customer/repair-status/${a.requestId}`} className="font-mono font-medium text-brand-600 hover:underline">{a.requestId}</Link></>
                  )}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-3 sm:ml-auto sm:w-auto">
                <StatusBadge status={a.status} />
                {a.status === "Scheduled" && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setResId(a.id); setRes({ date: a.date, time: a.time }); }}>Reschedule</Button>
                    <Button size="sm" variant="ghost" className="text-bad-500 hover:bg-bad-50" onClick={() => cancelAppointment(a.id)}>Cancel</Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New Appointment"
        scrollable
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={bookAppointment}>Book Appointment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Vehicle">
            <Select value={na.vehicleId} onChange={(e) => setNa({ ...na, vehicleId: e.target.value })}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
            </Select>
          </Field>
          <Field label="Service Type" required>
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-between font-normal"
              aria-label="Select services"
              aria-expanded={servicesOpen}
              aria-controls="appointment-services"
              aria-describedby="appointment-services-help"
              onClick={() => setServicesOpen((open) => !open)}
            >
              {na.services.length ? `${na.services.length} service${na.services.length === 1 ? "" : "s"} selected` : "Select services"}
              <IconChevronDown size={16} />
            </Button>
            {servicesOpen && (
              <div id="appointment-services" role="group" aria-label="Appointment services" className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-line bg-white p-3 shadow-sm"
                onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setServicesOpen(false); } }}>
                {serviceTypes.map((service) => (
                  <Label key={service}>
                    <span className="flex items-center gap-2 py-1">
                      <Input type="checkbox" name="appointment-services" value={service} checked={na.services.includes(service)} onChange={() => toggleService(service)} className="size-4! shrink-0 accent-brand-500" />
                      {service}
                    </span>
                  </Label>
                ))}
              </div>
            )}
            {na.services.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Selected appointment services">
                {na.services.map((service) => (
                  <Button key={service} type="button" variant="secondary" size="sm" className="rounded-full text-brand-600" aria-label={`Remove ${service}`} onClick={() => toggleService(service)}>
                    {service}<IconX size={14} />
                  </Button>
                ))}
              </div>
            )}
            <p id="appointment-services-help" className={`mt-1 text-sm ${servicesError ? "text-bad-500" : "text-ink-400"}`} role={servicesError ? "alert" : undefined}>
              {servicesError ? "Select at least one service." : "Select one or more services for this appointment."}
            </p>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date"><Input type="date" value={na.date} onChange={(e) => setNa({ ...na, date: e.target.value })} /></Field>
            <Field label="Time">
              <Select value={na.time} onChange={(e) => setNa({ ...na, time: e.target.value })}>
                {["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!resId}
        onClose={() => setResId(null)}
        title="Reschedule Appointment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResId(null)}>Cancel</Button>
            <Button onClick={() => { if (resId) rescheduleAppointment(resId, res.date, res.time); setResId(null); }}>Save</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="New Date"><Input type="date" value={res.date} onChange={(e) => setRes({ ...res, date: e.target.value })} /></Field>
          <Field label="New Time">
            <Select value={res.time} onChange={(e) => setRes({ ...res, time: e.target.value })}>
              {["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </>
  );
}

/* ============ Vehicle Check-In ============ */
export function CustomerCheckIn() {
  const pathname = useLogicalPath();
  const { requests, vehicles, assignments, checkIn } = useCustomerApp();
  const navigate = useNavigate();
  const m = matchPath("/customer/check-in/:id", pathname);
  const req = requests.find((r) => r.id === m?.params.id);
  const v = vehicles.find((x) => x.id === req?.vehicleId);

  const [data, setData] = useState({
    mileageIn: req?.mileageIn ?? v?.mileage ?? 0,
    exteriorCondition: "Good",
    interiorCondition: "Good",
    checkInNotes: "",
  });

  const carShots = [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=140&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=140&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=140&fit=crop&auto=format",
  ];

  if (!req) return <Card><EmptyState icon={<IconCar />} title="Record not found" text="This record is unavailable for your account." /></Card>;

  return (
    <>
      <PageHeader crumbs={[{ label: "Dashboard", to: "/customer/dashboard" }, { label: "Check-In" }]} title="Check-In Vehicle" />
      <Card className="max-w-3xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Service Request"><Input value={`${req?.id} — ${vehicleLabel(v)}`} readOnly /></Field>
          <Field label="Mileage"><Input type="number" value={data.mileageIn} onChange={(e) => setData({ ...data, mileageIn: +e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Customer Notes">
            <Textarea rows={3} value={data.checkInNotes} onChange={(e) => setData({ ...data, checkInNotes: e.target.value })} placeholder="The car makes a strange noise when braking." />
          </Field>
        </div>

        <h4 className="mt-6 mb-3 text-sm font-semibold text-ink-900">Condition Check</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Exterior Condition">
            <Select value={data.exteriorCondition} onChange={(e) => setData({ ...data, exteriorCondition: e.target.value })}>
              {["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Interior Condition">
            <Select value={data.interiorCondition} onChange={(e) => setData({ ...data, interiorCondition: e.target.value })}>
              {["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <h4 className="mt-6 mb-3 text-sm font-semibold text-ink-900">Check-In Photos</h4>
        <div className="flex flex-wrap gap-3">
          {carShots.map((s, i) => (
            <div key={i} className="h-20 w-28 overflow-hidden rounded-lg border border-line bg-slate-100">
              <img src={s} alt={`Vehicle angle ${i + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
          <button className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-ink-400 hover:border-brand-500 hover:text-brand-500">
            <IconPlus size={20} />
            <span className="text-[12px] font-medium">Upload</span>
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
          <Button variant="secondary" onClick={() => navigate("/customer/dashboard")}>Cancel</Button>
          <Button disabled={req.stage !== "Requested" || assignments.some((a) => a.requestId === req.id && a.status === "On Hold")} onClick={() => { if (!checkIn(req.id, data).ok) return; navigate(`/customer/repair-status/${req.id}`); }}>Check-In Vehicle</Button>
        </div>
      </Card>
    </>
  );
}

/* ============ Customer Approval ============ */
export function CustomerApproval() {
  const pathname = useLogicalPath();
  const { requests, vehicles, assignments, approveRepairs, rejectRepairs } = useCustomerApp();
  const navigate = useNavigate();
  const m = matchPath("/customer/approval/:id", pathname);
  const req = requests.find((r) => r.id === m?.params.id);
  const v = vehicles.find((x) => x.id === req?.vehicleId);
  const [selected, setSelected] = useState<string[]>(req?.repairs.map((r) => r.id) ?? []);
  const [comment, setComment] = useState("");
  // Repairs can only be approved once an admin has reviewed the estimate and sent it.
  const actionable = req?.stage === "Awaiting Customer Approval" && !assignments.some((a) => a.requestId === req.id && a.status === "On Hold");

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (!req) return <Card><EmptyState icon={<IconCar />} title="Record not found" text="This record is unavailable for your account." /></Card>;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Service Requests", to: "/customer/requests" }, { label: req?.id ?? "" }, { label: "Approval" }]}
        title="Approve Recommended Repairs"
      />
      <Card className="max-w-3xl">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <p className="text-[12px] font-medium text-ink-400">Vehicle</p>
            <p className="font-semibold text-ink-900">{vehicleLabel(v)}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-medium text-ink-400">Status</p>
            <StatusBadge status={req?.stage ?? ""} />
          </div>
        </div>

        {req?.diagnosis && (
          <div className="mx-6 mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-ink-700">
            <span className="font-semibold text-ink-900">Diagnosis: </span>{req.diagnosis}
          </div>
        )}

        <div className="px-6 pb-4">
          <h4 className="mb-2 text-sm font-semibold text-ink-900">Recommended Repairs</h4>
          {req && <EstimateTable lines={req.repairs} selectable={actionable} selected={selected} onToggle={toggle} />}
        </div>

        {!actionable && (
          <div className="mx-6 mb-6 rounded-lg bg-brand-50 px-4 py-3 text-[13px] text-brand-700 ring-1 ring-inset ring-brand-500/20">
            {req?.stage === "In Repair" || req?.stage === "Completed"
              ? "You've already approved this estimate."
              : "There's no estimate waiting for your approval right now. We'll notify you when it's ready."}
          </div>
        )}

        {actionable && (<>
        <div className="px-6 pb-2">
          <Label>Comments</Label>
          <Input placeholder="Enter your comments (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-3 p-6">
          <Button variant="success" onClick={() => { if (req) { if (!approveRepairs(req.id, req.repairs.map((r) => r.id), { note: comment.trim() || undefined }).ok) return; navigate(`/customer/repair-status/${req.id}`); } }}>
            <IconCheck size={16} /> Approve All
          </Button>
          <Button disabled={!selected.length} onClick={() => { if (req) { if (!approveRepairs(req.id, selected, { note: comment.trim() || undefined }).ok) return; navigate(`/customer/repair-status/${req.id}`); } }}>Approve Selected</Button>
          <Button variant="danger" onClick={() => { if (req) { if (!rejectRepairs(req.id, { note: comment.trim() || undefined }).ok) return; navigate(`/customer/requests`); } }}>Reject</Button>
          <Button variant="secondary">Request More Info</Button>
        </div>
        </>)}
      </Card>
    </>
  );
}

/* ============ Repair Status Tracking ============ */
export function RepairStatus() {
  const pathname = useLogicalPath();
  const { requests, vehicles } = useCustomerApp();
  const navigate = useNavigate();
  const m = matchPath("/customer/repair-status/:id", pathname);
  const req = requests.find((r) => r.id === m?.params.id);
  const v = vehicles.find((x) => x.id === req?.vehicleId);

  // Stage dates come from the recorded status history.
  const dates: Record<string, string> = {};
  for (const e of req?.timeline ?? []) {
    const st = e.stage ?? (e.label.startsWith("Service request") ? "Requested" : e.label === "Vehicle checked in" ? "Checked In" : e.label.startsWith("Diagnosis") ? "Diagnosed" : e.label === "Repair completed" ? "Completed" : null);
    if (st && !dates[st]) dates[st] = e.at.split(",")[0];
  }

  if (!req) return <Card><EmptyState icon={<IconCar />} title="Record not found" text="This record is unavailable for your account." /></Card>;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Service Requests", to: "/customer/requests" }, { label: req?.id ?? "" }]}
        title={`Service Request — ${req?.id}`}
      />
      <Card className="p-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-[12px] font-medium text-ink-400">Vehicle</p>
            <p className="font-semibold text-ink-900">{vehicleLabel(v)}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-medium text-ink-400">Status</p>
            <StatusBadge status={req?.stage ?? ""} />
          </div>
        </div>
        <div className="overflow-x-auto"><StageTracker stages={STAGES} current={req?.stage ?? "Requested"} dates={dates} /></div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Timeline" />
          <div className="p-6 pl-8"><Timeline items={[...(req?.timeline ?? [])].reverse()} /></div>
        </Card>
        <div className="space-y-5">
          {req?.stage === "Awaiting Customer Approval" && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-ink-900">Action Required</p>
              <p className="mt-1 text-[13px] text-ink-500">The diagnosis is ready. Please review and approve the recommended repairs.</p>
              <Button className="mt-3 w-full" onClick={() => navigate(`/customer/approval/${req.id}`)}>Review & Approve</Button>
            </Card>
          )}
          <Card className="p-5">
            <p className="text-sm font-semibold text-ink-900">Summary</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-400">Service</dt><dd className="font-medium text-ink-700">{req?.serviceType}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Requested</dt><dd className="text-ink-700 tabular">{req?.createdAt}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Estimated Total</dt><dd className="font-semibold text-ink-900 tabular">{money(req?.total ?? 0)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============ Invoice / Billing ============ */
export function CustomerInvoices() {
  const { invoices, requests, vehicles } = useCustomerApp();
  const navigate = useNavigate();
  const t = useTableData(invoices, (inv) => [inv.id, inv.requestId, vehicleLabel(vehicles.find((x) => x.id === inv.vehicleId)), inv.date, inv.status].join(" "));
  return (
    <>
      <PageHeader title="Invoices" subtitle="Download and review your billing history." />
      <Card>
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Invoice", "Vehicle", "Date", "Amount", "Status", ""]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={6} />}
            {t.rows.map((inv) => {
              const req = requests.find((r) => r.id === inv.requestId);
              const v = vehicles.find((x) => x.id === inv.vehicleId);
              const total = (req?.total ?? 0) * (1 + inv.taxRate);
              return (
                <Tr key={inv.id}>
                  <Td><span className="font-mono text-[13px] font-medium text-brand-600">{inv.id}</span></Td>
                  <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                  <Td className="tabular">{inv.date}</Td>
                  <Td className="font-medium text-ink-900 tabular">{money(total)}</Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td><Button size="sm" variant="secondary" onClick={() => navigate(`/customer/invoice/${inv.id}`)}>View</Button></Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>
    </>
  );
}

export function InvoiceDetail() {
  const pathname = useLogicalPath();
  const { invoices, requests, vehicles } = useCustomerApp();
  const m = matchPath("/customer/invoice/:id", pathname);
  const inv = invoices.find((i) => i.id === m?.params.id);
  const req = requests.find((r) => r.id === inv?.requestId);
  const v = vehicles.find((x) => x.id === inv?.vehicleId);
  const subtotal = req?.total ?? 0;
  const tax = subtotal * (inv?.taxRate ?? 0);

  if (!inv || !req) return <Card><EmptyState icon={<IconCar />} title="Record not found" text="This record is unavailable for your account." /></Card>;

  return (
    <>
      <PageHeader crumbs={[{ label: "Invoices", to: "/customer/invoices" }, { label: inv?.id ?? "" }]} title={`Invoice ${inv?.id}`} />
      <Card className="max-w-3xl p-8">
        <div className="flex items-start justify-between border-b border-line pb-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-white"><IconWrench size={20} /></div>
            <div>
              <p className="text-lg font-bold text-ink-900">AutoServe</p>
              <p className="text-[12px] text-ink-400">123 Service Lane, San Francisco</p>
            </div>
          </div>
          <StatusBadge status={inv?.status ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 text-sm">
          <div>
            <p className="text-[12px] font-medium text-ink-400">Billed To</p>
            <p className="font-semibold text-ink-900">John Doe</p>
            <p className="text-ink-500">{vehicleLabel(v)}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-medium text-ink-400">Invoice Date</p>
            <p className="font-semibold text-ink-900 tabular">{inv?.date}</p>
            <p className="mt-1 text-[12px] font-medium text-ink-400">Reference</p>
            <p className="font-mono text-[13px] text-ink-700">{inv?.requestId}</p>
          </div>
        </div>

        <Table>
          <Thead cols={["Description", "Type", "Qty", "Rate", "Amount"]} />
          <tbody>
            {req?.repairs.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-ink-900">{r.item}</Td>
                <Td>{r.type}</Td>
                <Td className="tabular">1</Td>
                <Td className="tabular">{money(r.cost)}</Td>
                <Td className="font-medium text-ink-900 tabular">{money(r.cost)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>

        <div className="ml-auto mt-5 w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="tabular text-ink-900">{money(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">Tax ({((inv?.taxRate ?? 0) * 100).toFixed(0)}%)</span><span className="tabular text-ink-900">{money(tax)}</span></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink-900"><span>Total</span><span className="tabular">{money(subtotal + tax)}</span></div>
        </div>

        <div className="mt-8 flex gap-3 border-t border-line pt-6">
          <Button><IconDownload size={16} /> Download PDF</Button>
          <Button variant="secondary"><IconPrinter size={16} /> Print</Button>
        </div>
      </Card>
    </>
  );
}

/* ============ Service History ============ */
export function ServiceHistory() {
  const { requests, vehicles } = useCustomerApp();
  const history = requests.filter((r) => r.stage === "Completed");
  const all = [...history, ...requests.filter((r) => r.stage !== "Completed")];
  const t = useTableData(all, (r) => [r.createdAt, r.id, vehicleLabel(vehicles.find((x) => x.id === r.vehicleId)), r.serviceType, r.total].join(" "));
  return (
    <>
      <PageHeader title="Service History" subtitle="A complete record of past services." />
      <Card>
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Date", "Request ID", "Vehicle", "Service", "Total"]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={5} />}
            {t.rows.map((r) => {
              const v = vehicles.find((x) => x.id === r.vehicleId);
              return (
                <Tr key={r.id}>
                  <Td className="tabular">{r.createdAt}</Td>
                  <Td><span className="font-mono text-[13px] font-medium text-brand-600">{r.id}</span></Td>
                  <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                  <Td>{r.serviceType}</Td>
                  <Td className="font-medium text-ink-900 tabular">{money0(r.total)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>
    </>
  );
}

/* ============ Notifications (shared style) ============ */
export function NotificationsPage() {
  const { notifications, markAllRead } = useCustomerApp();
  const iconFor = (k: string) =>
    k === "ok" ? <IconCheck size={16} /> : k === "warn" ? <IconWrench size={16} /> : k === "bell" ? <IconBell size={16} /> : <IconClipboard size={16} />;
  const tone = (k: string) => (k === "ok" ? "bg-ok-50 text-ok-700" : k === "warn" ? "bg-warn-50 text-warn-700" : "bg-brand-50 text-brand-600");
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Stay up to date on your services."
        action={<Button variant="secondary" onClick={markAllRead}>Mark all as read</Button>}
      />
      <Card>
        <div className="divide-y divide-line">
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3.5 px-5 py-4 ${!n.read ? "bg-brand-50/30" : ""}`}>
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone(n.kind)}`}>{iconFor(n.kind)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-800">{n.text}</p>
                <p className="mt-0.5 text-[12px] text-ink-400 tabular">{n.at}</p>
              </div>
              {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ============ Profile (shared) ============ */
const roleLabel: Record<Role, string> = { admin: "Admin / Service Manager", technician: "Technician", customer: "Customer" };

export function ProfilePage() {
  const { userName, accountId, availableRoles, technicians, users } = useCustomerApp();
  const account = accounts.find((x) => x.id === accountId);
  const user = users.find((u) => u.id === accountId || u.email.toLowerCase() === account?.email.toLowerCase());
  const name = userName ?? "";
  const email = account?.email ?? user?.email ?? "";
  const phone = account?.phone ?? user?.phone ?? "";
  const role = availableRoles.map((r) => roleLabel[r]).join(" + ");
  // Specialties are assigned by an Admin; technicians can only view them here.
  const tech = availableRoles.includes("technician")
    ? technicians.find((t) => t.email.toLowerCase() === email.toLowerCase() || t.name === name)
    : undefined;
  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your account details." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </div>
          <p className="mt-4 text-lg font-semibold text-ink-900">{name}</p>
          <p className="text-sm text-ink-500">{role}</p>
          <Button variant="secondary" className="mt-4 w-full"><IconEdit size={15} /> Change Photo</Button>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4 text-[15px] font-semibold text-ink-900">Personal Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name"><Input defaultValue={name} /></Field>
            <Field label="Email"><Input defaultValue={email} /></Field>
            <Field label="Phone"><Input defaultValue={phone} /></Field>
            <Field label="Role"><Input defaultValue={role} readOnly /></Field>
            <Field label="Address" className="col-span-2"><Input defaultValue="123 Market St, San Francisco, CA" /></Field>
            {availableRoles.includes("technician") && (
              <div className="col-span-2">
                <Label>Specialties</Label>
                <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-slate-50 px-3 py-2">
                  {tech?.specialties.length ? (
                    tech.specialties.map((sp) => (
                      <span key={sp} className="rounded-md bg-white px-2 py-0.5 text-[12px] font-medium text-ink-700 ring-1 ring-inset ring-line">{sp}</span>
                    ))
                  ) : (
                    <span className="text-[13px] text-ink-400">No specialties assigned</span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-ink-400">Specialties are managed by your administrator.</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-3 border-t border-line pt-5">
            <Button variant="secondary">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
