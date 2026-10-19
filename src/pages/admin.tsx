import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp, vehicleLabel } from "../store/AppContext";
import { Link, useNavigate, useQuery } from "../router";
import { AssignmentHold, ActivityHistory, EstimateTable } from "../components/workflow";
import { completedDate } from "./technician";
import { RANGES, inRange, iso, parseStamp, rangeBounds, rangeBuckets, type Range } from "../lib/dates";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Thead,
  Tr,
  money,
  money0,
  Textarea,
  useTableData,
  TableSearch,
  Pagination,
  NoRows,
  EmptyState,
  StageTracker,
} from "../components/ui";
import { BarChart, LineChart, DonutChart } from "../components/charts";
import {
  IconClipboard,
  IconCalendar,
  IconUsers,
  IconInvoice,
  IconPlus,
  IconEdit,
  IconTrash,
  IconWrench,
  IconBox,
  IconChart,
  IconDownload,
  IconAlert,
  IconClock,
  IconX,
  IconCheck,
  IconChevronDown,
} from "../components/icons";
import { STAGES, requestsSeries, revenueSeries, type ServiceRequest, type AppUser, type AssignmentStatus, type Part, type ServiceAssignment, type Technician } from "../data/mock";

/* ============ Admin Dashboard ============ */
const STAGE_COLORS: Record<string, string> = {
  Requested: "#94a3b8",
  "Checked In": "#64748b",
  Diagnosed: "#0ea5e9",
  "Pending Admin Review": "#f59e0b",
  "Awaiting Customer Approval": "#d97706",
  "In Repair": "#2563eb",
  Completed: "#16a34a",
};

export function AdminDashboard() {
  const { requests, appointments, technicians, assignments, parts, partRequests, eligibleRequests } = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("This Month");
  const bounds = rangeBounds(range);
  const inR = requests.filter((r) => inRange(r.createdAt, bounds));
  const count = (stage: string) => inR.filter((r) => r.stage === stage).length;
  const completed = requests.filter((r) => r.stage === "Completed" && inRange(completedDate(r), bounds));
  const revenue = completed.reduce((a, b) => a + b.total, 0);
  const upcoming = appointments.filter((a) => a.status === "Scheduled" && a.date >= iso(new Date())).length;
  const lowStock = parts.filter((p) => p.quantity < 10).length;
  const pendingParts = partRequests.filter((p) => p.status === "Pending").length;
  const unassigned = eligibleRequests.length;

  const buckets = rangeBuckets(range);
  const reqSeries = buckets.map((b) => ({ label: b.label, value: requests.filter((r) => r.createdAt >= b.from && r.createdAt <= b.to).length }));
  const revSeries = buckets.map((b) => ({
    month: b.label,
    value: requests.filter((r) => r.stage === "Completed").filter((r) => { const d = completedDate(r); return d >= b.from && d <= b.to; }).reduce((a, x) => a + x.total, 0),
  }));
  const segments = STAGES.map((s) => ({ label: s, value: count(s), color: STAGE_COLORS[s] })).filter((s) => s.value > 0);
  const workload = technicians.map((t) => ({
    id: t.id,
    label: t.name.split(" ")[0],
    value: assignments.filter((a) => a.technicianId === t.id && a.status !== "Completed").length,
  }));
  const activity = requests
    .flatMap((r) => r.timeline.map((t) => ({ ...t, requestId: r.id })))
    .sort((a, b) => parseStamp(b.at) - parseStamp(a.at))
    .slice(0, 8);

  const dateQ = bounds ? `&from=${bounds.from}&to=${bounds.to}` : "";
  const go = (q: string) => navigate(`/admin/requests?${q}${dateQ}`);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Service center performance at a glance. Click any card or chart to drill in."
        action={<Tabs tabs={RANGES} active={range} onChange={(v) => setRange(v as Range)} />}
      />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard icon={<IconClipboard />} label="Service Requests" value={inR.length} sub={range} onClick={() => go("tab=All Requests")} />
        <StatCard icon={<IconUsers />} label="Unassigned Requests" value={unassigned} sub="Current backlog · all dates" tone="bad" onClick={() => navigate("/admin/requests?tab=Unassigned")} />
        <StatCard icon={<IconAlert />} label="Pending Review" value={count("Pending Admin Review")} sub="Estimates to review" tone="warn" onClick={() => go("stage=Pending Admin Review")} />
        <StatCard icon={<IconClock />} label="Awaiting Customer" value={count("Awaiting Customer Approval")} sub="Approval needed" tone="warn" onClick={() => go("stage=Awaiting Customer Approval")} />
        <StatCard icon={<IconWrench />} label="In Repair" value={count("In Repair")} sub="Approved work" onClick={() => go("stage=In Repair")} />
        <StatCard icon={<IconInvoice />} label="Revenue" value={money0(revenue)} sub={`${completed.length} completed · ${range}`} tone="ok" onClick={() => go("tab=Completed")} />
        <StatCard icon={<IconCalendar />} label="Upcoming Appointments" value={upcoming} sub="Scheduled" onClick={() => navigate("/admin/appointments")} />
        <StatCard icon={<IconBox />} label="Low Stock" value={lowStock} sub={pendingParts ? `${pendingParts} part request${pendingParts > 1 ? "s" : ""} pending` : "Below 10 units"} tone={lowStock ? "warn" : "ok"} onClick={() => navigate(pendingParts ? "/admin/inventory?filter=requests" : "/admin/inventory?filter=low")} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={`New Requests (${range === "This Week" ? "daily" : range === "This Month" ? "weekly" : "monthly"})`} action={<span className="text-[12px] text-ink-400">Click a bar</span>} />
          <div className="p-5">
            <BarChart data={reqSeries} onSelect={(i) => navigate(`/admin/requests?from=${buckets[i].from}&to=${buckets[i].to}`)} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Revenue Trend" action={<span className="text-[12px] text-ink-400">Completed jobs</span>} />
          <div className="p-5"><LineChart data={revSeries} /></div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Requests by Stage" />
          <div className="p-5">
            {segments.length ? <DonutChart segments={segments} onSelect={(s) => go(`stage=${encodeURIComponent(s)}`)} /> : <p className="text-sm text-ink-400">No requests in this period.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Technician Workload" action={<span className="text-[12px] text-ink-400">Open assignments</span>} />
          <div className="p-5">
            <BarChart data={workload} color="#0ea5e9" onSelect={(i) => navigate(`/admin/requests?tab=Assigned&tech=${workload[i].id}`)} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent Activity" />
          <div className="max-h-[300px] divide-y divide-line overflow-y-auto">
            {activity.map((a, i) => (
              <button key={i} onClick={() => navigate(`/admin/requests?view=${a.requestId}`)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.kind === "ok" ? "bg-ok-500" : a.kind === "warn" ? "bg-warn-500" : "bg-brand-500"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink-900">{a.label}</span>
                  <span className="block truncate text-[11px] text-ink-400"><span className="font-mono">{a.requestId}</span> · {a.at}{a.by ? ` · ${a.by}` : ""}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Latest Service Requests" action={<Link to="/admin/requests" className="text-[13px] font-medium text-brand-600 hover:underline">View all</Link>} />
        <Table>
          <Thead cols={["Request ID", "Service", "Status", "Total"]} />
          <tbody>
            {requests.slice(0, 5).map((r) => (
              <Tr key={r.id} className="cursor-pointer">
                <Td><button onClick={() => navigate(`/admin/requests?view=${r.id}`)} className="font-mono text-[13px] font-medium text-brand-600 hover:underline">{r.id}</button></Td>
                <Td className="text-ink-900">{r.serviceType}</Td>
                <Td><StatusBadge status={r.stage} /></Td>
                <Td className="tabular">{money0(r.total)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

/* ============ Service Requests (admin) — includes technician assignment ============ */
const ASSIGN_STATUSES: AssignmentStatus[] = ["Assigned", "In Progress", "On Hold", "Completed"];
const REQUEST_TABS = ["All Requests", "Unassigned", "Assigned", "Completed"];

export function AdminRequests() {
  const {
    requests, vehicles, technicians, assignments, appointments, parts, partRequests, laborRate, isAdmin, eligibleRequests,
    addAssignment, updateAssignment, removeAssignment, reviewEstimate, approveRepairs, rejectRepairs, checkIn, completeRepair,
  } = useApp();
  const navigate = useNavigate();
  const q = useQuery();
  const [tab, setTab] = useState(q.get("tab") && REQUEST_TABS.includes(q.get("tab")!) ? q.get("tab")! : "All Requests");
  const [stageFilter, setStageFilter] = useState(q.get("stage") ?? "All");
  const [statusFilter, setStatusFilter] = useState(q.get("status") ?? "All");
  const [techFilter, setTechFilter] = useState(q.get("tech") ?? "All");
  const [dates, setDates] = useState<{ from: string; to: string } | null>(q.get("from") && q.get("to") ? { from: q.get("from")!, to: q.get("to")! } : null);
  const [viewId, setViewId] = useState<string | null>(q.get("view"));
  const [action, setAction] = useState<"review" | "consent" | "checkin" | "complete" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [consent, setConsent] = useState({ method: "Phone", note: "", selected: [] as string[] });
  const [ci, setCi] = useState({ mileageIn: 0, checkInNotes: "" });
  const [editFor, setEditFor] = useState<{ requestId: string; assignment?: ServiceAssignment } | null>(null);
  const [form, setForm] = useState({ requestId: "", technicianId: "", status: "Assigned" as AssignmentStatus, notes: "" });
  const [error, setError] = useState("");
  const [del, setDel] = useState<ServiceAssignment | null>(null);

  const stages = ["All", ...STAGES];
  const asgFor = (id: string) => assignments.find((a) => a.requestId === id);
  const techName = (id?: string) => technicians.find((x) => x.id === id)?.name;
  const isDone = (r: ServiceRequest) => r.stage === "Completed" || asgFor(r.id)?.status === "Completed";

  const byTab = requests.filter((r) => {
    const a = asgFor(r.id);
    if (tab === "Unassigned") return eligibleRequests.some((x) => x.id === r.id);
    if (tab === "Assigned") return !!a && !isDone(r);
    if (tab === "Completed") return isDone(r);
    return true;
  });
  const list = byTab.filter(
    (r) =>
      (stageFilter === "All" || r.stage === stageFilter) &&
      (statusFilter === "All" || (asgFor(r.id)?.status ?? "Unassigned") === statusFilter) &&
      (techFilter === "All" || asgFor(r.id)?.technicianId === techFilter) &&
      inRange(r.createdAt, dates),
  );
  const t = useTableData(list, (r) => {
    const a = asgFor(r.id);
    return [r.id, vehicleLabel(vehicles.find((x) => x.id === r.vehicleId)), r.serviceType, techName(a?.technicianId) ?? "Unassigned", r.stage, a?.status ?? "Unassigned", a?.notes ?? "", r.total].join(" ");
  });
  const counts = ASSIGN_STATUSES.map((s) => assignments.filter((a) => a.status === s).length);

  const openAssign = (requestId: string) => {
    const a = asgFor(requestId);
    setForm({ requestId, technicianId: a?.technicianId ?? technicians.find((t) => t.status !== "Off")?.id ?? "", status: a?.status ?? "Assigned", notes: a?.notes ?? "" });
    setError("");
    setEditFor({ requestId, assignment: a });
  };
  const save = () => {
    if (!isAdmin) return;
    if (!form.technicianId || !form.requestId) return setError("Select both a technician and a service request.");
    const result = editFor?.assignment ? updateAssignment({ ...editFor.assignment, technicianId: form.technicianId, status: form.status, notes: form.notes }) : addAssignment({ requestId: form.requestId, technicianId: form.technicianId, status: "Assigned", notes: form.notes });
    if (!result.ok) return setError(result.error ?? "Unable to assign request.");
    setEditFor(null);
  };

  const viewing = requests.find((r) => r.id === viewId);
  const viewingAsg = viewing ? asgFor(viewing.id) : undefined;

  return (
    <>
      <PageHeader
        title="Service Requests"
        subtitle="Manage incoming requests, assign technicians, and track progress."
        action={isAdmin ? <Button disabled={!eligibleRequests.length || !technicians.some((t) => t.status !== "Off")} onClick={() => openAssign(eligibleRequests[0].id)}><IconPlus size={16} /> Assign Service</Button> : undefined}
      />
      {(!eligibleRequests.length || !technicians.some((t) => t.status !== "Off")) && <div className="mb-4 text-sm text-ink-500">Assignment unavailable: no open unassigned requests or eligible technicians.</div>}
      <div className="mb-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard icon={<IconClipboard />} label="Assigned" value={counts[0]} sub="Not started" />
        <StatCard icon={<IconWrench />} label="In Progress" value={counts[1]} sub="Being worked on" tone="warn" />
        <StatCard icon={<IconCalendar />} label="On Hold" value={counts[2]} sub="Waiting" tone="bad" />
        <StatCard icon={<IconChart />} label="Completed" value={counts[3]} sub="Finished" tone="ok" />
      </div>
      <div className="mb-5 overflow-x-auto">
        <Tabs tabs={REQUEST_TABS} active={tab} onChange={(v) => { setTab(v); t.setPage(1); }} />
      </div>
      <Card>
        <TableSearch t={t}>
          <Select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); t.setPage(1); }} className="max-w-[200px]" aria-label="Filter by stage">
            {stages.map((s) => <option key={s} value={s}>{s === "All" ? "All stages" : s}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); t.setPage(1); }} className="max-w-[200px]" aria-label="Filter by assignment status">
            {["All", "Unassigned", ...ASSIGN_STATUSES].map((s) => <option key={s} value={s}>{s === "All" ? "All assignments" : s}</option>)}
          </Select>
          <Select value={techFilter} onChange={(e) => { setTechFilter(e.target.value); t.setPage(1); }} className="max-w-[200px]" aria-label="Filter by technician">
            <option value="All">All technicians</option>
            {technicians.filter((x) => x.status !== "Off" || x.id === editFor?.assignment?.technicianId).map((x) => <option key={x.id} value={x.id} disabled={x.status === "Off"}>{x.name}</option>)}
          </Select>
          {dates && (
            <button onClick={() => { setDates(null); t.setPage(1); }} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-50 px-3 text-[13px] font-medium text-brand-700 hover:bg-brand-100">
              {dates.from === dates.to ? dates.from : `${dates.from} → ${dates.to}`} <IconX size={14} />
            </button>
          )}
        </TableSearch>
        <Table>
          <Thead cols={["Request ID", "Vehicle", "Service", "Technician", "Assignment", "Stage", "Total", "Actions"]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={8} />}
            {t.rows.map((r) => {
              const v = vehicles.find((x) => x.id === r.vehicleId);
              const a = asgFor(r.id);
              return (
                <Tr key={r.id}>
                  <Td><span className="font-mono text-[13px] font-medium text-brand-600">{r.id}</span></Td>
                  <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                  <Td>{r.serviceType}</Td>
                  <Td>{techName(a?.technicianId) ?? <span className="text-ink-400">Unassigned</span>}</Td>
                  <Td>{a ? <StatusBadge status={a.status} /> : <span className="text-ink-400">—</span>}</Td>
                  <Td><StatusBadge status={r.stage} /></Td>
                  <Td className="font-medium text-ink-900 tabular">{money0(r.total)}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (a) {
                          const returnTo = `/admin/requests${q.size ? `?${q.toString()}` : ""}`;
                          navigate(`/admin/work-orders/${r.id}?returnTo=${encodeURIComponent(returnTo)}`);
                        } else setViewId(r.id);
                      }}>View</Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="secondary" disabled={isDone(r) || a?.status === "On Hold" || (!a && !eligibleRequests.some((x) => x.id === r.id))} onClick={() => openAssign(r.id)}>{a ? "Reassign" : "Assign"}</Button>
                          {a && !["On Hold", "Completed"].includes(a.status) && <button onClick={() => setDel(a)} aria-label="Remove assignment" className="grid h-8 w-8 place-items-center rounded-lg text-bad-500 hover:bg-bad-50"><IconTrash size={16} /></button>}
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>

      {isAdmin && (
        <Modal
          open={!!editFor}
          onClose={() => setEditFor(null)}
          title={editFor?.assignment ? "Update Assignment" : "Assign Technician"}
          footer={<><Button variant="secondary" onClick={() => setEditFor(null)}>Cancel</Button><Button onClick={save}>{editFor?.assignment ? "Save Changes" : "Assign"}</Button></>}
        >
          <div className="space-y-4">
            <Field label="Service Request" required>
              <Select value={form.requestId} disabled={!!editFor?.assignment} onChange={(e) => { setForm({ ...form, requestId: e.target.value }); setError(""); }}>
                {(editFor?.assignment ? requests.filter((r) => r.id === editFor.assignment!.requestId) : eligibleRequests).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} · {r.serviceType} · {vehicleLabel(vehicles.find((v) => v.id === r.vehicleId))}{asgFor(r.id) ? ` (${techName(asgFor(r.id)?.technicianId)})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Technician" required>
              <Select value={form.technicianId} onChange={(e) => { setForm({ ...form, technicianId: e.target.value }); setError(""); }}>
                {technicians.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.status}{x.specialties.length ? ` · ${x.specialties.join(", ")}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Assignment Status" required>
              <Select disabled={!editFor?.assignment} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AssignmentStatus })}>
                {["Assigned", "In Progress"].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Notes"><Input value={form.notes} placeholder="Optional instructions" onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            {error && <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{error}</div>}
          </div>
        </Modal>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewId(null)}
        title={`Request ${viewing?.id ?? ""}`}
        width="max-w-3xl"
        scrollable
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewId(null)}>Close</Button>
            {isAdmin && viewing && viewingAsg?.status !== "On Hold" && viewing.stage === "Requested" && <Button variant="secondary" onClick={() => { setCi({ mileageIn: 0, checkInNotes: "" }); setAction("checkin"); }}>Record Check-In</Button>}
            {isAdmin && viewing && viewingAsg?.status !== "On Hold" && viewing.stage === "Pending Admin Review" && <Button onClick={() => { setActionNote(""); setActionErr(""); setAction("review"); }}>Review Estimate</Button>}
            {isAdmin && viewing && viewingAsg?.status !== "On Hold" && viewing.stage === "Awaiting Customer Approval" && (
              <Button onClick={() => { setConsent({ method: "Phone", note: "", selected: viewing.repairs.map((l) => l.id) }); setActionErr(""); setAction("consent"); }}>Record Customer Consent</Button>
            )}
            {isAdmin && viewing && viewingAsg?.status !== "On Hold" && viewing.stage === "In Repair" && <Button variant="success" onClick={() => { setActionNote(""); setAction("complete"); }}>Mark Complete</Button>}
            {isAdmin && viewing && viewingAsg?.status !== "On Hold" && viewing.stage !== "Completed" && <Button variant="secondary" onClick={() => { const id = viewing.id; setViewId(null); openAssign(id); }}><IconEdit size={16} /> {viewingAsg ? "Reassign" : "Assign"}</Button>}
          </>
        }
      >
        {viewing && (() => {
          const linked = appointments.filter((ap) => ap.requestId === viewing.id);
          const prs = partRequests.filter((p) => p.requestId === viewing.id);
          const rows: [string, ReactNode][] = [
            ["Service", viewing.serviceType],
            ["Vehicle", vehicleLabel(vehicles.find((v) => v.id === viewing.vehicleId))],
            ["Created", viewing.createdAt],
            ["Technician", techName(viewingAsg?.technicianId) ?? "Unassigned"],
            // Assignment status is tracked separately from work progress (stage).
            ["Assignment Status", viewingAsg ? <StatusBadge status={viewingAsg.status} /> : "—"],
            ["Work Progress", <StatusBadge status={viewing.stage} />],
            ["Assigned On", viewingAsg?.assignedAt ?? "—"],
            ["Assignment Notes", viewingAsg?.notes || "—"],
          ];
          return (
            <div className="space-y-6">
              <AssignmentHold assignment={viewingAsg} />
              <div className="overflow-x-auto"><StageTracker stages={[...STAGES]} current={viewing.stage} /></div>
              <dl className="grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5"><dt className="text-ink-500">{k}</dt><dd className="text-right font-medium text-ink-900">{v}</dd></div>
                ))}
              </dl>
              <div>
                <p className="mb-1 text-[13px] font-semibold text-ink-900">Diagnosis</p>
                <p className="text-sm text-ink-700">{viewing.diagnosis || <span className="text-ink-400">Not diagnosed yet.</span>}</p>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-900">Repair Estimate</p>
                <EstimateTable lines={viewing.repairs} />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-ink-900">Linked Appointments</p>
                  {linked.length ? (
                    <div className="space-y-1.5">
                      {linked.map((ap) => (
                        <div key={ap.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13px]">
                          <span className="tabular text-ink-700">{ap.date} · {ap.time}</span>
                          <StatusBadge status={ap.status} />
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[13px] text-ink-400">No appointments linked.</p>}
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-ink-900">Part Requests</p>
                  {prs.length ? (
                    <div className="space-y-1.5">
                      {prs.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13px]">
                          <span className="text-ink-700">{p.qty} × {parts.find((x) => x.id === p.partId)?.name}</span>
                          <StatusBadge status={p.status} />
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[13px] text-ink-400">No part requests.</p>}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[13px] font-semibold text-ink-900">Activity & Status History</p>
                <div className="pl-2"><ActivityHistory req={viewing} /></div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Admin: review a technician's estimate */}
      <Modal
        open={action === "review" && !!viewing}
        onClose={() => setAction(null)}
        title={`Review Estimate — ${viewing?.id ?? ""}`}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (!actionNote.trim()) return setActionErr("Add a note explaining what to revise."); const result = reviewEstimate(viewing!.id, "revise", actionNote.trim()); if (!result.ok) return setActionErr(result.error ?? "Unable to request revision."); setAction(null); }}>Request Revision</Button>
            <Button variant="danger" onClick={() => { const result = reviewEstimate(viewing!.id, "reject", actionNote.trim()); if (!result.ok) return setActionErr(result.error ?? "Unable to reject."); setAction(null); }}>Reject</Button>
            <Button onClick={() => { const result = reviewEstimate(viewing!.id, "send", actionNote.trim() || undefined); if (!result.ok) return setActionErr(result.error ?? "Unable to approve."); setAction(null); }}>Approve</Button>
          </>
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-ink-700"><span className="font-semibold text-ink-900">Diagnosis: </span>{viewing.diagnosis || "—"}</div>
            <EstimateTable lines={viewing.repairs} />
            <p className="text-[12px] text-ink-400">Approve sends this estimate for customer approval only; it does not assign or complete work. Prices use current inventory prices and the {money(laborRate)}/h labor rate. Adjust them in Inventory or Settings before sending.</p>
            <Field label="Note"><Textarea rows={2} value={actionNote} onChange={(e) => { setActionNote(e.target.value); setActionErr(""); }} placeholder="Required when rejecting or requesting a revision" /></Field>
            {actionErr && <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{actionErr}</div>}
          </div>
        )}
      </Modal>

      {/* Admin: record customer consent when the customer approves offline */}
      <Modal
        open={action === "consent" && !!viewing}
        onClose={() => setAction(null)}
        title={`Record Customer Consent — ${viewing?.id ?? ""}`}
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { const result = rejectRepairs(viewing!.id, { method: consent.method, note: consent.note.trim() || undefined }); if (!result.ok) return setActionErr(result.error ?? "Unable to record rejection."); setAction(null); }}>Record Rejection</Button>
            <Button variant="success" onClick={() => { if (!consent.selected.length) return setActionErr("Select at least one approved repair."); const result = approveRepairs(viewing!.id, consent.selected, { method: consent.method, note: consent.note.trim() || undefined }); if (!result.ok) return setActionErr(result.error ?? "Unable to record approval."); setAction(null); }}>Record Approval</Button>
          </>
        }
      >
        {viewing && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink-500">Use this when the customer approves by phone, in person or by email instead of the customer portal.</p>
            <EstimateTable lines={viewing.repairs} selectable selected={consent.selected} onToggle={(id) => { setActionErr(""); setConsent({ ...consent, selected: consent.selected.includes(id) ? consent.selected.filter((x) => x !== id) : [...consent.selected, id] }); }} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Consent Method" required>
                <Select value={consent.method} onChange={(e) => setConsent({ ...consent, method: e.target.value })}>
                  {["Phone", "In person", "Email", "SMS"].map((m) => <option key={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Note"><Input value={consent.note} onChange={(e) => setConsent({ ...consent, note: e.target.value })} placeholder="e.g. Spoke with John at 3:10 PM" /></Field>
            </div>
            {actionErr && <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{actionErr}</div>}
          </div>
        )}
      </Modal>

      <Modal
        open={action === "checkin" && !!viewing}
        onClose={() => setAction(null)}
        title="Record Check-In"
        footer={<><Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button><Button onClick={() => { if (checkIn(viewing!.id, { mileageIn: ci.mileageIn || undefined, checkInNotes: ci.checkInNotes || undefined }).ok) setAction(null); }}>Check In</Button></>}
      >
        <div className="space-y-4">
          <Field label="Mileage"><Input type="number" value={ci.mileageIn} onChange={(e) => setCi({ ...ci, mileageIn: +e.target.value })} /></Field>
          <Field label="Notes"><Textarea rows={3} value={ci.checkInNotes} onChange={(e) => setCi({ ...ci, checkInNotes: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={action === "complete" && !!viewing}
        onClose={() => setAction(null)}
        title="Mark Repair Complete"
        footer={<><Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button><Button variant="success" onClick={() => { if (completeRepair(viewing!.id, actionNote.trim() || undefined).ok) setAction(null); }}>Complete</Button></>}
      >
        <Field label="Notes (optional)"><Textarea rows={3} value={actionNote} onChange={(e) => setActionNote(e.target.value)} /></Field>
      </Modal>

      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title="Remove Assignment"
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (del && removeAssignment(del.id).ok) setDel(null); }}>Remove</Button></>}
      >
        <p className="text-sm text-ink-700">
          Unassign <span className="font-semibold">{techName(del?.technicianId)}</span> from <span className="font-semibold">{del?.requestId}</span>? The request will move to Unassigned.
        </p>
      </Modal>
    </>
  );
}

/* ============ Appointments (admin) ============ */
const TIMES = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];

export function AdminAppointments() {
  const { appointments, vehicles, requests, isAdmin, addAppointment, rescheduleAppointment, cancelAppointment } = useApp();
  const [tab, setTab] = useState("Upcoming");
  const list = appointments
    .filter((a) => (tab === "Upcoming" ? a.status === "Scheduled" : a.status !== "Scheduled"))
    .sort((a, b) => (tab === "Upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
  const t = useTableData(list, (a) => [a.date, a.time, vehicleLabel(vehicles.find((x) => x.id === a.vehicleId)), a.serviceType, a.status, a.requestId ?? ""].join(" "));

  const [newOpen, setNewOpen] = useState(false);
  const firstReq = requests[0];
  const [na, setNa] = useState({ requestId: firstReq?.id ?? "", date: "", time: "10:00 AM" });
  const [naErr, setNaErr] = useState("");
  const [resId, setResId] = useState<string | null>(null);
  const [res, setRes] = useState({ date: "", time: "10:00 AM" });
  const [cancelId, setCancelId] = useState<string | null>(null);

  const book = () => {
    const r = requests.find((x) => x.id === na.requestId);
    if (!r) return setNaErr("Select a service request.");
    if (!na.date) return setNaErr("Choose a date.");
    addAppointment({ vehicleId: r.vehicleId, serviceType: r.serviceType, date: na.date, time: na.time, requestId: r.id });
    setNewOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="All scheduled service center appointments."
        action={isAdmin ? <Button onClick={() => { setNa({ requestId: firstReq?.id ?? "", date: "", time: "10:00 AM" }); setNaErr(""); setNewOpen(true); }}><IconPlus size={16} /> New Appointment</Button> : undefined}
      />
      <div className="mb-5"><Tabs tabs={["Upcoming", "Past"]} active={tab} onChange={(v) => { setTab(v); t.setPage(1); }} /></div>
      <Card>
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Date", "Time", "Vehicle", "Service", "Request", "Status", ...(isAdmin ? ["Actions"] : [])]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={isAdmin ? 7 : 6} />}
            {t.rows.map((a) => {
              const v = vehicles.find((x) => x.id === a.vehicleId);
              return (
                <Tr key={a.id}>
                  <Td className="tabular">{a.date}</Td>
                  <Td className="tabular">{a.time}</Td>
                  <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                  <Td>{a.serviceType}</Td>
                  <Td>{a.requestId ? <span className="font-mono text-[13px] font-medium text-brand-600">{a.requestId}</span> : <span className="text-ink-400">—</span>}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  {isAdmin && (
                    <Td>
                      {a.status === "Scheduled" ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => { setResId(a.id); setRes({ date: a.date, time: a.time }); }}>Reschedule</Button>
                          <Button size="sm" variant="ghost" className="text-bad-500 hover:bg-bad-50" onClick={() => setCancelId(a.id)}>Cancel</Button>
                        </div>
                      ) : <span className="text-ink-400">—</span>}
                    </Td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New Appointment"
        footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={book}>Book Appointment</Button></>}
      >
        <div className="space-y-4">
          <Field label="Service Request" required>
            <Select value={na.requestId} onChange={(e) => { setNa({ ...na, requestId: e.target.value }); setNaErr(""); }}>
              {requests.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.serviceType} · {vehicleLabel(vehicles.find((v) => v.id === r.vehicleId))}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" required><Input type="date" value={na.date} onChange={(e) => { setNa({ ...na, date: e.target.value }); setNaErr(""); }} /></Field>
            <Field label="Time">
              <Select value={na.time} onChange={(e) => setNa({ ...na, time: e.target.value })}>
                {TIMES.map((x) => <option key={x}>{x}</option>)}
              </Select>
            </Field>
          </div>
          {naErr && <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{naErr}</div>}
        </div>
      </Modal>

      <Modal
        open={!!resId}
        onClose={() => setResId(null)}
        title="Reschedule Appointment"
        footer={<><Button variant="secondary" onClick={() => setResId(null)}>Cancel</Button><Button onClick={() => { if (resId && res.date) rescheduleAppointment(resId, res.date, res.time); setResId(null); }}>Save</Button></>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="New Date"><Input type="date" value={res.date} onChange={(e) => setRes({ ...res, date: e.target.value })} /></Field>
          <Field label="New Time">
            <Select value={res.time} onChange={(e) => setRes({ ...res, time: e.target.value })}>
              {TIMES.map((x) => <option key={x}>{x}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel Appointment"
        footer={<><Button variant="secondary" onClick={() => setCancelId(null)}>Keep</Button><Button variant="danger" onClick={() => { if (cancelId) cancelAppointment(cancelId); setCancelId(null); }}>Cancel Appointment</Button></>}
      >
        <p className="text-sm text-ink-700">This appointment will move to Past as Cancelled.</p>
      </Modal>
    </>
  );
}

/* ============ User Management ============ */
export function UserManagement() {
  const { users, addUser, updateUser, removeUser } = useApp();
  const [edit, setEdit] = useState<AppUser | null>(null);
  const [open, setOpen] = useState(false);
  const blank: AppUser = { id: "", name: "", email: "", role: "Customer", status: "Active", phone: "" };
  const [form, setForm] = useState<AppUser>(blank);
  const t = useTableData(users, (u) => [u.name, u.email, u.role, u.status, u.phone].join(" "));

  const openNew = () => { setForm(blank); setEdit(null); setOpen(true); };
  const openEdit = (u: AppUser) => { setForm(u); setEdit(u); setOpen(true); };
  const save = () => {
    if (edit) updateUser(form);
    else addUser(form);
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Manage customer and staff accounts." action={<Button onClick={openNew}><IconPlus size={16} /> Add User</Button>} />
      <Card>
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Name", "Email", "Role", "Status", "Actions"]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={5} />}
            {t.rows.map((u) => (
              <Tr key={u.id}>
                <Td className="font-medium text-ink-900">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.role}</Td>
                <Td><StatusBadge status={u.status} /></Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="grid h-8 w-8 place-items-center rounded-lg text-brand-600 hover:bg-brand-50"><IconEdit size={16} /></button>
                    <button onClick={() => removeUser(u.id)} className="grid h-8 w-8 place-items-center rounded-lg text-bad-500 hover:bg-bad-50"><IconTrash size={16} /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit User" : "Add User"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{edit ? "Save" : "Add User"}</Button></>}
      >
        <div className="space-y-4">
          <Field label="Full Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppUser["role"] })}>
                {["Customer", "Technician", "Service Manager", "Admin"].map((r) => <option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AppUser["status"] })}>
                {["Active", "Invited", "Suspended"].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ============ Admin-only guard ============ */
function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useApp();
  if (!isAdmin) {
    return <Card><EmptyState icon={<IconUsers />} title="Admin access required" text="Only administrators can manage technicians and assignments." /></Card>;
  }
  return <>{children}</>;
}

/* ============ Specialty helpers ============ */
export function SpecialtyChips({ list }: { list: string[] }) {
  if (!list.length) return <span className="text-ink-400">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((s) => (
        <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-ink-700">{s}</span>
      ))}
    </div>
  );
}

/**
 * Searchable multi-select for specialties. Admins can also create, rename and
 * delete catalog entries inline. Rendered only inside admin-guarded forms.
 */
function SpecialtyMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { specialties, isAdmin, addSpecialty, renameSpecialty, removeSpecialty } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const query = q.trim();
  const filtered = specialties.filter((s) => s.toLowerCase().includes(query.toLowerCase()));
  const exists = specialties.some((s) => s.toLowerCase() === query.toLowerCase());
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);

  const create = () => {
    if (!isAdmin || query.length < 2 || exists) return;
    addSpecialty(query);
    onChange([...value, query]);
    setQ("");
  };
  const saveRename = (from: string) => {
    const to = draft.trim();
    if (to.length < 2) return setErr("Name must be 2+ characters.");
    if (specialties.some((s) => s.toLowerCase() === to.toLowerCase() && s !== from)) return setErr("Already exists.");
    renameSpecialty(from, to);
    onChange(value.map((x) => (x === from ? to : x)));
    setEditing(null);
    setErr("");
  };
  const del = (s: string) => {
    removeSpecialty(s);
    onChange(value.filter((x) => x !== s));
    setConfirmDel(null);
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(true)}
        className={`flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 transition-colors ${open ? "border-brand-500 ring-2 ring-brand-500/15" : "border-line"}`}
      >
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-0.5 pl-2 pr-1 text-[12px] font-medium text-brand-700">
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={(e) => { e.stopPropagation(); toggle(s); }} className="grid h-4 w-4 place-items-center rounded hover:bg-brand-100">
              <IconX size={12} />
            </button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); if (filtered.length === 1 && !value.includes(filtered[0])) { toggle(filtered[0]); setQ(""); } else create(); }
            if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={value.length ? "" : "Search or add specialties..."}
          className="h-7 min-w-[120px] flex-1 bg-transparent px-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <IconChevronDown size={16} className="mr-1 shrink-0 text-ink-400" />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-lg">
          {filtered.map((s) => {
            const on = value.includes(s);
            if (editing === s) {
              return (
                <div key={s} className="flex items-center gap-1.5 px-2 py-1.5">
                  <Input value={draft} autoFocus onChange={(e) => { setDraft(e.target.value); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveRename(s); } if (e.key === "Escape") setEditing(null); }} className="!h-8" />
                  <Button size="sm" type="button" onClick={() => saveRename(s)}>Save</Button>
                  <Button size="sm" type="button" variant="secondary" onClick={() => { setEditing(null); setErr(""); }}>Cancel</Button>
                </div>
              );
            }
            if (confirmDel === s) {
              return (
                <div key={s} className="flex items-center justify-between gap-2 rounded-md bg-bad-50 px-2.5 py-1.5 text-[13px] text-bad-700">
                  <span className="truncate">Delete "{s}" for all technicians?</span>
                  <span className="flex shrink-0 gap-1">
                    <Button size="sm" type="button" variant="danger" onClick={() => del(s)}>Delete</Button>
                    <Button size="sm" type="button" variant="secondary" onClick={() => setConfirmDel(null)}>Cancel</Button>
                  </span>
                </div>
              );
            }
            return (
              <div key={s} className="group flex items-center gap-1 rounded-md hover:bg-slate-50">
                <button type="button" onClick={() => toggle(s)} className="flex flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm text-ink-700">
                  <span className={`grid h-4 w-4 place-items-center rounded border ${on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white"}`}>
                    {on && <IconCheck size={11} />}
                  </span>
                  {s}
                </button>
                {isAdmin && (
                  <span className="flex pr-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button type="button" aria-label={`Rename ${s}`} onClick={() => { setEditing(s); setDraft(s); setErr(""); }} className="grid h-7 w-7 place-items-center rounded-md text-brand-600 hover:bg-brand-50"><IconEdit size={14} /></button>
                    <button type="button" aria-label={`Delete ${s}`} onClick={() => setConfirmDel(s)} className="grid h-7 w-7 place-items-center rounded-md text-bad-500 hover:bg-bad-50"><IconTrash size={14} /></button>
                  </span>
                )}
              </div>
            );
          })}
          {err && <p className="px-2.5 pb-1 text-[12px] text-bad-700">{err}</p>}
          {filtered.length === 0 && !query && <p className="px-2.5 py-2 text-[13px] text-ink-400">No specialties defined yet.</p>}
          {isAdmin && query.length >= 2 && !exists && (
            <button type="button" onClick={create} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-brand-600 hover:bg-brand-50">
              <IconPlus size={15} /> Create "{query}"
            </button>
          )}
          {query && filtered.length === 0 && (exists || query.length < 2) && <p className="px-2.5 py-2 text-[13px] text-ink-400">No matches.</p>}
        </div>
      )}
    </div>
  );
}

/* ============ Technician Management ============ */
type TechForm = { name: string; email: string; phone: string; password: string; status: Technician["status"]; specialties: string[] };
const blankTech: TechForm = { name: "", email: "", phone: "", password: "", status: "Available", specialties: [] };

function validateTech(f: TechForm, existingEmails: string[], isEdit: boolean) {
  const e: Partial<Record<keyof TechForm, string>> = {};
  if (!f.specialties.length) e.specialties = "Select at least one specialty.";
  if (f.name.trim().length < 2) e.name = "Enter the technician's full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
  else if (existingEmails.includes(f.email.trim().toLowerCase())) e.email = "This email is already in use.";
  if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid phone number (10+ digits).";
  // Password is required on create; optional on edit (blank keeps the current one).
  if (!isEdit || f.password) {
    if (f.password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = "Use both letters and numbers.";
  }
  return e;
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-[12px] text-bad-700">{msg}</p> : null;
}

export function TechnicianManagement() {
  return <AdminOnly><TechnicianManagementInner /></AdminOnly>;
}

function TechnicianManagementInner() {
  const { technicians, users, addTechnician, updateTechnician } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form, setForm] = useState<TechForm>(blankTech);
  const [errors, setErrors] = useState<Partial<Record<keyof TechForm, string>>>({});
  const [saved, setSaved] = useState("");
  const t = useTableData(technicians, (x) => [x.name, x.email, x.phone ?? "", ...x.specialties, x.status].join(" "));

  const set = (k: keyof TechForm, v: string) => {
    setForm({ ...form, [k]: v });
    setErrors({ ...errors, [k]: undefined });
  };
  const openNew = () => { setEditing(null); setForm(blankTech); setErrors({}); setOpen(true); };
  const openEdit = (x: Technician) => {
    setEditing(x);
    setForm({ name: x.name, email: x.email, phone: x.phone ?? "", password: "", status: x.status, specialties: x.specialties });
    setErrors({});
    setOpen(true);
  };
  const submit = () => {
    const self = editing?.email.toLowerCase();
    const emails = [...technicians.map((x) => x.email), ...users.map((u) => u.email)].map((e) => e.toLowerCase()).filter((e) => e !== self);
    const e = validateTech(form, emails, !!editing);
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), status: form.status, specialties: form.specialties };
    if (editing) {
      updateTechnician({ ...editing, ...data });
      setSaved(`${data.name} was updated.`);
    } else {
      addTechnician(data);
      setSaved(`${data.name} was added as a technician.`);
    }
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Technicians"
        subtitle="Monitor technician workload and performance."
        action={<Button onClick={openNew}><IconPlus size={16} /> Add Technician</Button>}
      />
      {saved && (
        <div className="mb-5 flex items-center justify-between rounded-lg bg-ok-50 px-4 py-3 text-sm text-ok-700 ring-1 ring-inset ring-ok-500/20">
          {saved}
          <button onClick={() => setSaved("")} className="text-[12px] font-semibold hover:underline">Dismiss</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {technicians.slice(0, 6).map((t) => (
          <Card key={t.id} className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
                {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{t.name}</p>
                <p className="truncate text-[13px] text-ink-500">{t.specialties.join(", ") || "No specialties"}</p>
              </div>
              <div className="ml-auto"><StatusBadge status={t.status} /></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
              <div><p className="text-lg font-bold text-ink-900 tabular">{t.activeJobs}</p><p className="text-[11px] text-ink-400">Active</p></div>
              <div><p className="text-lg font-bold text-ink-900 tabular">{t.completed}</p><p className="text-[11px] text-ink-400">Completed</p></div>
              <div><p className="text-lg font-bold text-ink-900 tabular">{t.rating || "—"}</p><p className="text-[11px] text-ink-400">Rating</p></div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHeader title="All Technicians" />
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Name", "Email", "Phone", "Specialties", "Active Jobs", "Status", "Actions"]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={7} />}
            {t.rows.map((x) => (
              <Tr key={x.id}>
                <Td className="font-medium text-ink-900">{x.name}</Td>
                <Td>{x.email}</Td>
                <Td className="tabular">{x.phone ?? "—"}</Td>
                <Td><SpecialtyChips list={x.specialties} /></Td>
                <Td className="tabular">{x.activeJobs}</Td>
                <Td><StatusBadge status={x.status} /></Td>
                <Td>
                  <button onClick={() => openEdit(x)} aria-label={`Edit ${x.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-brand-600 hover:bg-brand-50"><IconEdit size={16} /></button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Technician" : "Add Technician"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>{editing ? "Save Changes" : "Add Technician"}</Button></>}
      >
        <div className="space-y-4">
          <Field label="Full Name" required><Input value={form.name} placeholder="Jane Smith" onChange={(e) => set("name", e.target.value)} /><FieldError msg={errors.name} /></Field>
          <Field label="Email" required><Input type="email" value={form.email} placeholder="jane@autoserve.com" onChange={(e) => set("email", e.target.value)} /><FieldError msg={errors.email} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone" required><Input value={form.phone} placeholder="(415) 555-0123" onChange={(e) => set("phone", e.target.value)} /><FieldError msg={errors.phone} /></Field>
            <Field label="Status" required>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {["Available", "Busy", "Off"].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Password" required={!editing}>
            <Input type="password" value={form.password} placeholder={editing ? "Leave blank to keep current" : "At least 8 characters"} onChange={(e) => set("password", e.target.value)} />
            <FieldError msg={errors.password} />
          </Field>
          <Field label="Specialties" required>
            <SpecialtyMultiSelect value={form.specialties} onChange={(v) => { setForm({ ...form, specialties: v }); setErrors({ ...errors, specialties: undefined }); }} />
            <FieldError msg={errors.specialties} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

/* ============ Reports ============ */
const serviceBreakdown: [string, number, number, string][] = [
  ["Brake Service", 48, 12400, "2.5h"],
  ["Oil Change", 92, 5520, "0.6h"],
  ["AC Service", 34, 4080, "1.8h"],
  ["Engine Diagnostics", 21, 6300, "3.1h"],
];

export function Reports() {
  const t = useTableData(serviceBreakdown, (r) => r.join(" "));
  return (
    <>
      <PageHeader title="Reports" subtitle="Business insights and performance analytics." action={<Button variant="secondary"><IconDownload size={16} /> Export</Button>} />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard icon={<IconInvoice />} label="Total Revenue" value={money0(20930)} sub="Year to date" />
        <StatCard icon={<IconClipboard />} label="Jobs Completed" value={214} sub="Year to date" tone="ok" />
        <StatCard icon={<IconChart />} label="Avg Ticket" value={money0(310)} sub="Per job" tone="warn" />
        <StatCard icon={<IconUsers />} label="New Customers" value={38} sub="This quarter" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card><CardHeader title="Monthly Revenue" /><div className="p-5"><LineChart data={revenueSeries} height={230} /></div></Card>
        <Card><CardHeader title="Requests by Day" /><div className="p-5"><BarChart data={requestsSeries} height={230} /></div></Card>
      </div>
      <Card className="mt-5">
        <CardHeader title="Service Breakdown" />
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Service Type", "Jobs", "Revenue", "Avg Duration"]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={4} />}
            {t.rows.map((row) => (
              <Tr key={row[0] as string}>
                <Td className="font-medium text-ink-900">{row[0]}</Td>
                <Td className="tabular">{row[1]}</Td>
                <Td className="tabular">{money0(row[2] as number)}</Td>
                <Td className="tabular">{row[3]}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>
    </>
  );
}

/* ============ Inventory ============ */
export function Inventory() {
  const { parts, addPart, updatePart, removePart, partRequests, requests, technicians, resolvePartRequest, isAdmin, laborRate } = useApp();
  const q = useQuery();
  const [stockFilter, setStockFilter] = useState(q.get("filter") === "low" ? "Low stock" : "All");
  const [prFilter, setPrFilter] = useState(q.get("filter") === "requests" ? "Pending" : "All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Part | null>(null);
  const blank: Part = { id: "", name: "", number: "", quantity: 0, price: 0, category: "Engine" };
  const [form, setForm] = useState<Part>(blank);
  const lowStock = parts.filter((p) => p.quantity < 10).length;
  const shownParts = stockFilter === "Low stock" ? parts.filter((p) => p.quantity < 10) : parts;
  const t = useTableData(shownParts, (p) => [p.name, p.number, p.category, p.quantity, p.price].join(" "));
  const prList = prFilter === "All" ? partRequests : partRequests.filter((p) => p.status === prFilter);
  const pt = useTableData(prList, (p) => [p.requestId, parts.find((x) => x.id === p.partId)?.name ?? "", technicians.find((x) => x.id === p.technicianId)?.name ?? "", p.status, p.note].join(" "));
  const pendingCount = partRequests.filter((p) => p.status === "Pending").length;

  const openNew = () => { setForm(blank); setEdit(null); setOpen(true); };
  const openEdit = (p: Part) => { setForm(p); setEdit(p); setOpen(true); };
  const save = () => { if (edit) updatePart(form); else addPart(form); setOpen(false); };

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`Track parts stock and pricing. Labor rate: ${money(laborRate)}/h (Settings → Billing).`}
        action={isAdmin ? <Button onClick={openNew}><IconPlus size={16} /> Add Part</Button> : undefined}
      />
      <div className="mb-5 grid grid-cols-2 gap-5 lg:grid-cols-3">
        <StatCard icon={<IconBox />} label="Total Parts" value={parts.length} sub="SKUs tracked" />
        <StatCard icon={<IconBox />} label="Low Stock" value={lowStock} sub={pendingCount ? `${pendingCount} part request${pendingCount > 1 ? "s" : ""} pending` : "Below 10 units"} tone="warn" onClick={() => { setStockFilter("Low stock"); t.setPage(1); }} />
        <StatCard icon={<IconInvoice />} label="Stock Value" value={money0(parts.reduce((a, b) => a + b.price * b.quantity, 0))} sub="At cost" tone="ok" />
      </div>
      <Card>
        <TableSearch t={t}>
          <Select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); t.setPage(1); }} className="max-w-[180px]" aria-label="Stock filter">
            {["All", "Low stock"].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </TableSearch>
        <Table>
          <Thead cols={["Part Name", "Part Number", "Category", "Quantity", "Unit Price", "Actions"]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={6} />}
            {t.rows.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium text-ink-900">{p.name}</Td>
                <Td><span className="font-mono text-[13px] text-ink-500">{p.number}</span></Td>
                <Td>{p.category}</Td>
                <Td>
                  <span className={`tabular font-medium ${p.quantity < 10 ? "text-warn-700" : "text-ink-700"}`}>{p.quantity}</span>
                </Td>
                <Td className="tabular">{money(p.price)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="grid h-8 w-8 place-items-center rounded-lg text-brand-600 hover:bg-brand-50"><IconEdit size={16} /></button>
                    <button onClick={() => removePart(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-bad-500 hover:bg-bad-50"><IconTrash size={16} /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>

      <Card className="mt-5">
        <CardHeader title="Technician Part Requests" />
        <TableSearch t={pt}>
          <Select value={prFilter} onChange={(e) => { setPrFilter(e.target.value); pt.setPage(1); }} className="max-w-[180px]" aria-label="Request status">
            {["All", "Pending", "Issued", "Rejected"].map((x) => <option key={x}>{x}</option>)}
          </Select>
        </TableSearch>
        <Table>
          <Thead cols={["Requested", "Job", "Technician", "Part", "Qty", "In Stock", "Status", "Actions"]} />
          <tbody>
            {pt.rows.length === 0 && <NoRows cols={8} />}
            {pt.rows.map((p) => {
              const part = parts.find((x) => x.id === p.partId);
              const job = requests.find((r) => r.id === p.requestId);
              return (
                <Tr key={p.id}>
                  <Td className="text-[13px] tabular">{p.at}</Td>
                  <Td><span className="font-mono text-[13px] font-medium text-brand-600">{p.requestId}</span>{job && <span className="block text-[12px] text-ink-400">{job.serviceType}</span>}</Td>
                  <Td>{technicians.find((x) => x.id === p.technicianId)?.name ?? "—"}</Td>
                  <Td className="text-ink-900">{part?.name ?? "Unknown"}{p.note && <span className="block text-[12px] text-ink-400">{p.note}</span>}</Td>
                  <Td className="tabular">{p.qty}</Td>
                  <Td className={`tabular ${part && part.quantity < p.qty ? "font-medium text-bad-700" : ""}`}>{part?.quantity ?? 0}</Td>
                  <Td><StatusBadge status={p.status} />{p.resolvedBy && <span className="block text-[11px] text-ink-400">by {p.resolvedBy}</span>}</Td>
                  <Td>
                    {isAdmin && p.status === "Pending" ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="success" disabled={!part || part.quantity < p.qty} onClick={() => resolvePartRequest(p.id, true)}>Issue</Button>
                        <Button size="sm" variant="ghost" className="text-bad-500 hover:bg-bad-50" onClick={() => resolvePartRequest(p.id, false)}>Reject</Button>
                      </div>
                    ) : <span className="text-ink-400">—</span>}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        <Pagination t={pt} />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit Part" : "Add Part"}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{edit ? "Save" : "Add Part"}</Button></>}
      >
        <div className="space-y-4">
          <Field label="Part Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Part Number"><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["Engine", "Brakes", "Fluids", "HVAC", "Exterior", "Electrical"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Quantity"><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></Field>
            <Field label="Unit Price"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ============ Settings ============ */
export function Settings() {
  const { laborRate, setLaborRate, isAdmin } = useApp();
  const [tab, setTab] = useState("General");
  const [rate, setRate] = useState(laborRate);
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure your service center." />
      <div className="mb-5"><Tabs tabs={["General", "Notifications", "Billing"]} active={tab} onChange={setTab} /></div>
      <Card className="max-w-2xl p-6">
        {tab === "General" && (
          <div className="space-y-4">
            <Field label="Service Center Name"><Input defaultValue="AutoServe — Downtown" /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Phone"><Input defaultValue="(415) 555-0100" /></Field>
              <Field label="Email"><Input defaultValue="hello@autoserve.com" /></Field>
            </div>
            <Field label="Address"><Input defaultValue="123 Service Lane, San Francisco, CA" /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Opening Time"><Input type="time" defaultValue="08:00" /></Field>
              <Field label="Closing Time"><Input type="time" defaultValue="18:00" /></Field>
            </div>
          </div>
        )}
        {tab === "Notifications" && (
          <div className="space-y-3">
            {["Email notifications", "SMS alerts", "Appointment reminders", "Marketing updates"].map((l, i) => (
              <label key={l} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                <span className="text-sm font-medium text-ink-700">{l}</span>
                <input type="checkbox" defaultChecked={i < 3} className="h-4 w-4 rounded border-line accent-brand-500" />
              </label>
            ))}
          </div>
        )}
        {tab === "Billing" && (
          <div className="space-y-4">
            <Field label="Labor Rate ($/hour)">
              <Input type="number" min={0} step={5} value={rate} disabled={!isAdmin} onChange={(e) => setRate(+e.target.value)} />
              <p className="mt-1.5 text-[12px] text-ink-400">Used to price technician labor hours on every estimate.</p>
            </Field>
            <Field label="Tax Rate (%)"><Input type="number" defaultValue={8} /></Field>
            <Field label="Currency"><Select defaultValue="USD"><option>USD</option><option>EUR</option><option>GBP</option></Select></Field>
            <Field label="Invoice Prefix"><Input defaultValue="INV" /></Field>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
          <Button variant="secondary">Cancel</Button>
          <Button onClick={() => { if (rate !== laborRate) setLaborRate(rate); }}>Save Changes</Button>
        </div>
      </Card>
    </>
  );
}
