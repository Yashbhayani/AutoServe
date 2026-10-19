import { useState } from "react";
import { Link, matchPath, useLogicalPath, useNavigate, useQuery } from "../router";
import { EDITABLE_STAGES, lineCost, useApp, vehicleLabel, type ActionResult } from "../store/AppContext";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StageTracker,
  StatCard,
  StatusBadge,
  Table,
  Tabs,
  useTableData,
  TableSearch,
  Pagination,
  NoRows,
  Td,
  Textarea,
  Thead,
  Tr,
  money,
} from "../components/ui";
import { BarChart, DonutChart } from "../components/charts";
import { AssignmentHold, ActivityHistory, EstimateTable, revisionNote } from "../components/workflow";
import {
  IconAlert,
  IconBox,
  IconClipboard,
  IconClock,
  IconCheck,
  IconWrench,
  IconPlus,
  IconTrash,
  IconChevronRight,
} from "../components/icons";
import { STAGES, type RepairLine, type ServiceRequest } from "../data/mock";
import { DAY_NAMES, RANGES, addDays, fmtDay, fmtRange, fromIso, inRange, iso, parseStamp, rangeBounds, rangeBuckets, startOfWeek, weekDays, type Range } from "../lib/dates";

const STAGE_COLORS: Record<string, string> = {
  Requested: "#94a3b8",
  "Checked In": "#64748b",
  Diagnosed: "#0ea5e9",
  "Pending Admin Review": "#f59e0b",
  "Awaiting Customer Approval": "#d97706",
  "In Repair": "#2563eb",
  Completed: "#16a34a",
};

/** Jobs assigned to the signed-in technician (shared data, no hardcoded IDs). */
function useMyJobs() {
  const { requests, myTechId } = useApp();
  return myTechId ? requests.filter((r) => r.technicianId === myTechId) : [];
}

function NotATechnician() {
  return (
    <Card>
      <EmptyState icon={<IconWrench />} title="No technician profile" text="Your account isn't linked to a technician record, so there are no jobs to show." />
    </Card>
  );
}

/* ============ Technician Dashboard ============ */
export function TechDashboard() {
  const { userName, vehicles, timeLogs, myTechId, partRequests, parts } = useApp();
  const navigate = useNavigate();
  const jobs = useMyJobs();
  const [range, setRange] = useState<Range>("This Week");
  const bounds = rangeBounds(range);
  const myLogs = timeLogs.filter((l) => l.technicianId === myTechId);
  const count = (stage: string) => jobs.filter((r) => r.stage === stage).length;
  const hours = myLogs.filter((l) => inRange(l.date, bounds)).reduce((a, b) => a + b.hours, 0);
  const completedInRange = jobs.filter((r) => r.stage === "Completed" && inRange(completedDate(r), bounds)).length;
  const buckets = rangeBuckets(range);
  const hourSeries = buckets.map((b) => ({
    label: b.label,
    value: myLogs.filter((l) => l.date >= b.from && l.date <= b.to).reduce((a, x) => a + x.hours, 0),
  }));
  const segments = STAGES.map((s) => ({ label: s, value: count(s), color: STAGE_COLORS[s] })).filter((s) => s.value > 0);
  const activity = jobs
    .flatMap((r) => r.timeline.map((t) => ({ ...t, requestId: r.id })))
    .sort((a, b) => parseStamp(b.at) - parseStamp(a.at))
    .slice(0, 6);
  const myPending = partRequests.filter((p) => p.technicianId === myTechId && p.status === "Pending").length;
  const wo = (stage: string) => navigate(`/technician/work-orders?stage=${encodeURIComponent(stage)}`);

  if (!myTechId) return (<><PageHeader title={`Welcome, ${userName?.split(" ")[0] ?? ""}`} /><NotATechnician /></>);

  return (
    <>
      <PageHeader
        title={`Welcome, ${userName?.split(" ")[0] ?? ""}`}
        subtitle="Your jobs, estimates and hours at a glance."
        action={<Tabs tabs={RANGES.slice(0, 2)} active={range} onChange={(v) => setRange(v as Range)} />}
      />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={<IconClipboard />} label="Assigned Jobs" value={jobs.filter((r) => r.stage !== "Completed").length} sub="Open" onClick={() => navigate("/technician/jobs")} />
        <StatCard icon={<IconWrench />} label="To Diagnose" value={count("Checked In") + count("Diagnosed")} sub="Needs estimate" tone="warn" onClick={() => wo("Diagnosed")} />
        <StatCard icon={<IconAlert />} label="In Review" value={count("Pending Admin Review") + count("Awaiting Customer Approval")} sub="Admin / customer" tone="warn" onClick={() => wo("Pending Admin Review")} />
        <StatCard icon={<IconWrench />} label="In Repair" value={count("In Repair")} sub="Approved work" onClick={() => wo("In Repair")} />
        <StatCard icon={<IconCheck />} label="Completed" value={completedInRange} sub={range} tone="ok" onClick={() => wo("Completed")} />
        <StatCard icon={<IconClock />} label="Hours Logged" value={hours.toFixed(1)} sub={range} onClick={() => navigate("/technician/time-log")} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={range === "This Week" ? "Daily Hours (Mon–Sun)" : "Weekly Hours (this month)"} action={<span className="text-[12px] text-ink-400">Click a bar to open the time log</span>} />
          <div className="p-5">
            <BarChart
              data={hourSeries}
              format={(v) => v.toFixed(1)}
              onSelect={(i) => navigate(`/technician/time-log?week=${iso(startOfWeek(fromIso(buckets[i].from)))}`)}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="My Jobs by Stage" />
          <div className="p-5">
            {segments.length ? <DonutChart segments={segments} onSelect={wo} /> : <p className="text-sm text-ink-400">No jobs assigned.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="My Jobs" action={<Link to="/technician/jobs" className="text-[13px] font-medium text-brand-600 hover:underline">View all</Link>} />
          <Table>
            <Thead cols={["Request ID", "Vehicle", "Service", "Status", ""]} />
            <tbody>
              {jobs.length === 0 && <NoRows cols={5} />}
              {jobs.slice(0, 5).map((r) => {
                const v = vehicles.find((x) => x.id === r.vehicleId);
                return (
                  <Tr key={r.id}>
                    <Td><span className="font-mono text-[13px] font-medium text-brand-600">{r.id}</span></Td>
                    <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                    <Td>{r.serviceType}</Td>
                    <Td><StatusBadge status={r.stage} /></Td>
                    <Td><Link to={`/technician/work-orders/${r.id}`} className="text-[13px] font-medium text-brand-600 hover:underline">Open</Link></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Recent Activity" action={myPending ? <Link to="/technician/parts" className="text-[12px] font-medium text-warn-700 hover:underline">{myPending} part request{myPending > 1 ? "s" : ""} pending</Link> : undefined} />
          <div className="divide-y divide-line">
            {activity.length === 0 && <p className="px-5 py-4 text-sm text-ink-400">No activity yet.</p>}
            {activity.map((a, i) => (
              <button key={i} onClick={() => navigate(`/technician/work-orders/${a.requestId}`)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.kind === "ok" ? "bg-ok-500" : a.kind === "warn" ? "bg-warn-500" : "bg-brand-500"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink-900">{a.label}</span>
                  <span className="block text-[11px] text-ink-400"><span className="font-mono">{a.requestId}</span> · {a.at}{a.by ? ` · ${a.by}` : ""}</span>
                </span>
              </button>
            ))}
          </div>
          {parts.length > 0 && null}
        </Card>
      </div>
    </>
  );
}

/** Date a request was completed (from its history), falling back to its created date. */
export function completedDate(r: ServiceRequest) {
  const e = [...r.timeline].reverse().find((t) => t.stage === "Completed" || t.label === "Repair completed");
  const ts = e ? parseStamp(e.at) : 0;
  return ts ? iso(new Date(ts)) : r.createdAt;
}

/* ============ Assigned Jobs ============ */
export function AssignedJobs() {
  const { vehicles, assignments, myTechId } = useApp();
  const navigate = useNavigate();
  const jobs = useMyJobs();
  if (!myTechId) return (<><PageHeader title="My Jobs" /><NotATechnician /></>);
  return (
    <>
      <PageHeader title="My Jobs" subtitle="Jobs assigned to you." />
      {jobs.length === 0 && <Card><EmptyState icon={<IconClipboard />} title="No jobs assigned" text="New assignments from your admin will appear here." /></Card>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((r) => {
          const v = vehicles.find((x) => x.id === r.vehicleId);
          const a = assignments.find((x) => x.requestId === r.id);
          return (
            <Card key={r.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-semibold text-brand-600">{r.id}</span>
                <StatusBadge status={r.stage} />
              </div>
              <p className="mt-3 font-semibold text-ink-900">{vehicleLabel(v)}</p>
              <p className="text-sm text-ink-500">{r.serviceType}</p>
              <p className="mt-2 line-clamp-2 text-[13px] text-ink-400">{r.concern}</p>
              {a && <p className="mt-2 text-[12px] text-ink-400">Assignment: <span className="font-medium text-ink-700">{a.status}</span></p>}
              <Button className="mt-4 w-full" size="sm" onClick={() => navigate(`/technician/work-orders/${r.id}`)}>
                <IconWrench size={15} /> Open Work Order
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ============ Work Orders list ============ */
export function WorkOrders() {
  const { vehicles, myTechId, isAdmin, requests } = useApp();
  const navigate = useNavigate();
  const q = useQuery();
  const assignedJobs = useMyJobs();
  const jobs = isAdmin ? requests : assignedJobs;
  const [stage, setStage] = useState(q.get("stage") ?? "All");
  const list = stage === "All" ? jobs : jobs.filter((r) => r.stage === stage || (stage === "Diagnosed" && r.stage === "Checked In") || (stage === "Pending Admin Review" && r.stage === "Awaiting Customer Approval"));
  const t = useTableData(list, (r) => [r.id, vehicleLabel(vehicles.find((x) => x.id === r.vehicleId)), r.concern, r.stage].join(" "));
  if (!myTechId && !isAdmin) return (<><PageHeader title="Work Orders" /><NotATechnician /></>);
  return (
    <>
      <PageHeader title="Work Orders" subtitle="Diagnose, estimate and complete approved repairs." />
      <Card>
        <TableSearch t={t}>
          <Select value={stage} onChange={(e) => { setStage(e.target.value); t.setPage(1); }} className="max-w-[240px]" aria-label="Filter by stage">
            {["All", ...STAGES].map((s) => <option key={s} value={s}>{s === "All" ? "All stages" : s}</option>)}
          </Select>
        </TableSearch>
        <Table>
          <Thead cols={["Request ID", "Vehicle", "Concern", "Status", "Estimate", ""]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={6} />}
            {t.rows.map((r) => {
              const v = vehicles.find((x) => x.id === r.vehicleId);
              return (
                <Tr key={r.id}>
                  <Td><span className="font-mono text-[13px] font-medium text-brand-600">{r.id}</span></Td>
                  <Td className="text-ink-900">{vehicleLabel(v)}</Td>
                  <Td className="max-w-xs truncate text-ink-500">{r.concern}</Td>
                  <Td><StatusBadge status={r.stage} /></Td>
                  <Td className="tabular">{money(r.total)}</Td>
                  <Td><Button size="sm" variant="secondary" onClick={() => navigate(`/technician/work-orders/${r.id}`)}>Open</Button></Td>
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

/* ============ Work Order / Diagnosis & Estimate ============ */
export function WorkOrderDetail() {
  const pathname = useLogicalPath();
  const navigate = useNavigate();
  const returnTo = useQuery().get("returnTo");
  const { requests, vehicles, parts, laborRate, assignments, partRequests, myTechId, isAdmin, checkIn, saveEstimate, completeRepair, requestPart } = useApp();
  const fromRequests = isAdmin && returnTo?.split("?")[0] === "/admin/requests";
  const m = matchPath("/technician/work-orders/:id", pathname) ?? matchPath("/admin/work-orders/:id", pathname);
  const req = requests.find((r) => r.id === m?.params.id);
  const v = vehicles.find((x) => x.id === req?.vehicleId);
  const mine = !!req && !!myTechId && req.technicianId === myTechId;
  const held = assignments.some((a) => a.requestId === req?.id && a.status === "On Hold");
  const editable = mine && !held && !!req && EDITABLE_STAGES.includes(req.stage);

  const [diagnosis, setDiagnosis] = useState(req?.diagnosis ?? "");
  const [lines, setLines] = useState<RepairLine[]>(req?.repairs ?? []);
  const [dirty, setDirty] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [ci, setCi] = useState({ mileageIn: v?.mileage ?? 0, checkInNotes: "" });
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState("");
  const [partOpen, setPartOpen] = useState(false);

  if (!req) return (<><PageHeader crumbs={[{ label: "Work Orders", to: "/technician/work-orders" }, { label: "Not found" }]} title="Work Order" /><Card><EmptyState icon={<IconClipboard />} title="Work order not found" /></Card></>);
  if (!mine && !isAdmin) {
    return (<><PageHeader crumbs={[{ label: "Work Orders", to: "/technician/work-orders" }, { label: req.id }]} title={`Work Order — ${req.id}`} /><Card><EmptyState icon={<IconAlert />} title="Not assigned to you" text="You can only open work orders assigned to you." /></Card></>);
  }

  const assignment = assignments.find((a) => a.requestId === req.id);
  const priced = lines.map((l) => ({ ...l, cost: lineCost(l, parts, laborRate) }));
  const total = priced.reduce((a, b) => a + b.cost, 0);
  const revision = revisionNote(req);
  const jobPartReqs = partRequests.filter((p) => p.requestId === req.id);

  const change = (fn: (s: RepairLine[]) => RepairLine[]) => { setLines(fn); setDirty(true); setMsg(""); setErr(""); };
  const addPart = () => change((s) => [...s, { id: `r${Date.now()}`, item: parts[0]?.name ?? "", type: "Part", partId: parts[0]?.id, qty: 1, cost: 0 }]);
  const addLabor = () => change((s) => [...s, { id: `r${Date.now()}`, item: "", type: "Labor", hours: 1, cost: 0 }]);
  const setLine = (id: string, patch: Partial<RepairLine>) => change((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const delLine = (id: string) => change((s) => s.filter((r) => r.id !== id));

  const validate = () => {
    if (!diagnosis.trim()) return "Enter your diagnosis.";
    for (const l of lines) {
      if (l.type === "Labor" && !l.item.trim()) return "Describe each labor line.";
      if (l.partId && (!l.qty || l.qty < 1)) return "Part quantities must be at least 1.";
      if (l.type === "Labor" && l.hours != null && !(l.hours > 0 && l.hours <= 40)) return "Labor hours must be between 0 and 40.";
    }
    return "";
  };
  const save = () => {
    const e = validate();
    if (e) return setErr(e);
    const result = saveEstimate(req.id, diagnosis.trim(), lines);
    if (!result.ok) return setErr(result.error ?? "Unable to save.");
    setDirty(false);
    setMsg("Draft saved.");
  };
  const submit = () => {
    const e = validate() || (lines.length === 0 ? "Add at least one part or labor line." : "");
    if (e) return setErr(e);
    const result = saveEstimate(req.id, diagnosis.trim(), lines, { submit: true, note: submitNote.trim() || undefined });
    if (!result.ok) return setErr(result.error ?? "Unable to submit.");
    setDirty(false);
    setSubmitNote("");
    setMsg("Estimate submitted for admin review.");
  };

  const banner: Record<string, { tone: string; text: string }> = {
    Requested: { tone: "info", text: "Vehicle not checked in yet. Check it in to start the diagnosis." },
    "Pending Admin Review": { tone: "warn", text: "Estimate submitted — waiting for admin review. Editing is locked." },
    "Awaiting Customer Approval": { tone: "warn", text: "Estimate sent to the customer. Repairs can start only after approval." },
    "In Repair": { tone: "info", text: "Customer approved the estimate. Complete the approved repairs, then mark the job complete." },
    Completed: { tone: "ok", text: "This job is completed." },
  };
  const toneCls: Record<string, string> = {
    info: "bg-brand-50 text-brand-700 ring-brand-500/20",
    warn: "bg-warn-50 text-warn-700 ring-warn-500/20",
    ok: "bg-ok-50 text-ok-700 ring-ok-500/20",
    bad: "bg-bad-50 text-bad-700 ring-bad-500/20",
  };
  const b = banner[req.stage];

  return (
    <>
      <PageHeader crumbs={[{ label: "Work Orders", to: "/technician/work-orders" }, { label: req.id }]} title={`Work Order — ${req.id}`}
        action={fromRequests ? <Button variant="secondary" onClick={() => navigate(returnTo!)}>Back to Service Requests</Button> : undefined} />
      <AssignmentHold assignment={assignment} />
      <Card className="mb-5 overflow-x-auto p-6"><StageTracker stages={[...STAGES]} current={req.stage} /></Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-5 border-b border-line pb-5 sm:grid-cols-3">
              <div>
                <p className="text-[12px] font-medium text-ink-400">Vehicle</p>
                <p className="font-semibold text-ink-900">{vehicleLabel(v)}</p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-ink-400">Work Progress</p>
                <StatusBadge status={req.stage} />
              </div>
              <div>
                <p className="text-[12px] font-medium text-ink-400">Assignment</p>
                {assignment ? <StatusBadge status={assignment.status} /> : <span className="text-sm text-ink-400">—</span>}
              </div>
            </div>

            <div className="py-5">
              <p className="text-[12px] font-medium text-ink-400">Customer Concern</p>
              <p className="mt-1 text-sm text-ink-700">{req.concern}</p>
            </div>

            {b && <div className={`mb-5 rounded-lg px-4 py-3 text-[13px] ring-1 ring-inset ${toneCls[b.tone]}`}>{b.text}</div>}
            {revision && (
              <div className={`mb-5 rounded-lg px-4 py-3 text-[13px] ring-1 ring-inset ${toneCls.bad}`}>
                <p className="font-semibold">{revision.label}</p>
                {revision.note && <p className="mt-0.5">{revision.note}</p>}
                <p className="mt-0.5 text-[12px] opacity-80">{revision.by} · {revision.at}</p>
              </div>
            )}

            {req.stage === "Requested" && mine && !held && (
              <Button onClick={() => setCheckInOpen(true)}><IconCheck size={16} /> Check In Vehicle</Button>
            )}

            {req.stage !== "Requested" && (
              <>
                <Field label="Diagnosis" required={editable}>
                  <Textarea rows={3} value={diagnosis} disabled={!editable} onChange={(e) => { setDiagnosis(e.target.value); setDirty(true); setMsg(""); }} placeholder="Describe your findings..." />
                </Field>

                <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-ink-900">Repair Estimate</h4>
                  {editable && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={addPart}><IconBox size={15} /> Add Part</Button>
                      <Button size="sm" variant="secondary" onClick={addLabor}><IconPlus size={15} /> Add Labor</Button>
                    </div>
                  )}
                </div>

                {editable ? (
                  <>
                    <Table>
                      <Thead cols={["Item", "Type", "Qty / Hours", "Unit Price", "Amount", ""]} />
                      <tbody>
                        {priced.length === 0 && <NoRows cols={6} />}
                        {priced.map((l) => {
                          const part = parts.find((p) => p.id === l.partId);
                          return (
                            <Tr key={l.id}>
                              <Td className="min-w-[200px]">
                                {l.partId ? (
                                  <Select value={l.partId} onChange={(e) => { const p = parts.find((x) => x.id === e.target.value); setLine(l.id, { partId: e.target.value, item: p?.name ?? "" }); }} className="h-9">
                                    {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</option>)}
                                  </Select>
                                ) : l.type === "Labor" && l.hours != null ? (
                                  <Input value={l.item} onChange={(e) => setLine(l.id, { item: e.target.value })} placeholder="e.g. Rotor resurfacing" className="h-9" />
                                ) : (
                                  <span className="font-medium text-ink-900">{l.item}</span>
                                )}
                              </Td>
                              <Td>{l.type}</Td>
                              <Td className="w-28">
                                {l.partId ? (
                                  <Input type="number" min={1} value={l.qty ?? 1} onChange={(e) => setLine(l.id, { qty: Math.max(0, Math.floor(+e.target.value)) })} className="h-9" aria-label="Quantity" />
                                ) : l.hours != null ? (
                                  <Input type="number" min={0.25} step={0.25} value={l.hours} onChange={(e) => setLine(l.id, { hours: +e.target.value })} className="h-9" aria-label="Labor hours" />
                                ) : (
                                  <span className="text-ink-400">—</span>
                                )}
                              </Td>
                              {/* Prices are read-only: inventory price or admin labor rate. */}
                              <Td className="tabular text-ink-500">{part ? money(part.price) : l.hours != null ? `${money(laborRate)}/h` : "Fixed"}</Td>
                              <Td className="font-medium text-ink-900 tabular">{money(l.cost)}</Td>
                              <Td className="w-12"><button onClick={() => delLine(l.id)} aria-label="Remove line" className="grid h-8 w-8 place-items-center rounded-lg text-bad-500 hover:bg-bad-50"><IconTrash size={16} /></button></Td>
                            </Tr>
                          );
                        })}
                      </tbody>
                    </Table>
                    <p className="mt-2 text-[12px] text-ink-400">Unit prices come from inventory and the shop labor rate ({money(laborRate)}/h), which are managed by your admin.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                      <span className="text-sm font-semibold text-ink-900">Total Estimated Cost</span>
                      <span className="text-lg font-bold text-ink-900 tabular">{money(total)}</span>
                    </div>
                    <div className="mt-5">
                      <Field label="Note for admin (optional)"><Input value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} placeholder="e.g. Customer mentioned the noise started last week" /></Field>
                    </div>
                    {err && <div className={`mt-4 rounded-lg px-3.5 py-2.5 text-[13px] ring-1 ring-inset ${toneCls.bad}`}>{err}</div>}
                    {msg && !err && <div className={`mt-4 rounded-lg px-3.5 py-2.5 text-[13px] ring-1 ring-inset ${toneCls.ok}`}>{msg}</div>}
                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                      <Button variant="secondary" onClick={save} disabled={!dirty}>Save Draft</Button>
                      <Button onClick={submit}>Submit Estimate</Button>
                    </div>
                  </>
                ) : (
                  <EstimateTable lines={req.repairs} />
                )}

                {msg && !editable && <div className={`mt-4 rounded-lg px-3.5 py-2.5 text-[13px] ring-1 ring-inset ${toneCls.ok}`}>{msg}</div>}
                {req.stage === "In Repair" && !held && (mine || isAdmin) && (
                  <div className="mt-5 flex justify-end">
                    <Button variant="success" onClick={() => setCompleteOpen(true)}><IconCheck size={16} /> Mark Repair Complete</Button>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card>
            <CardHeader title="Parts for this Job" action={mine && !held && req.stage !== "Completed" ? <Button size="sm" variant="secondary" onClick={() => setPartOpen(true)}><IconPlus size={15} /> Request Part</Button> : undefined} />
            <Table>
              <Thead cols={["Part", "Qty", "Requested", "Status"]} />
              <tbody>
                {jobPartReqs.length === 0 && <NoRows cols={4} />}
                {jobPartReqs.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium text-ink-900">{parts.find((x) => x.id === p.partId)?.name ?? "Unknown part"}</Td>
                    <Td className="tabular">{p.qty}</Td>
                    <Td className="text-[13px] tabular">{p.at}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <Card>
          <CardHeader title="Activity & Status History" />
          <div className="p-6 pl-8"><ActivityHistory req={req} /></div>
        </Card>
      </div>

      <Modal
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        title="Check In Vehicle"
        footer={<><Button variant="secondary" onClick={() => setCheckInOpen(false)}>Cancel</Button><Button onClick={() => { if (checkIn(req.id, { mileageIn: ci.mileageIn, checkInNotes: ci.checkInNotes || undefined }).ok) setCheckInOpen(false); }}>Check In</Button></>}
      >
        <div className="space-y-4">
          <Field label="Mileage"><Input type="number" value={ci.mileageIn} onChange={(e) => setCi({ ...ci, mileageIn: +e.target.value })} /></Field>
          <Field label="Notes"><Textarea rows={3} value={ci.checkInNotes} onChange={(e) => setCi({ ...ci, checkInNotes: e.target.value })} placeholder="Condition, customer remarks..." /></Field>
        </div>
      </Modal>

      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Mark Repair Complete"
        footer={<><Button variant="secondary" onClick={() => setCompleteOpen(false)}>Cancel</Button><Button variant="success" onClick={() => { if (!completeRepair(req.id, completeNote.trim() || undefined).ok) return; setCompleteOpen(false); setMsg("Repair marked complete."); }}>Complete</Button></>}
      >
        <Field label="Completion notes (optional)"><Textarea rows={3} value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="Work performed, road test results..." /></Field>
      </Modal>

      <PartRequestModal open={partOpen} onClose={() => setPartOpen(false)} fixedRequestId={req.id} onSubmit={requestPart} />
    </>
  );
}

/* ============ Part request modal (technician) ============ */
function PartRequestModal({
  open,
  onClose,
  fixedRequestId,
  initialPartId,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  fixedRequestId?: string;
  initialPartId?: string;
  onSubmit: (requestId: string, partId: string, qty: number, note: string) => ActionResult;
}) {
  const { parts, vehicles, assignments } = useApp();
  const jobs = useMyJobs().filter((r) => r.stage !== "Completed" && !assignments.some((a) => a.requestId === r.id && a.status === "On Hold"));
  const [requestId, setRequestId] = useState(fixedRequestId ?? jobs[0]?.id ?? "");
  const [partId, setPartId] = useState(initialPartId ?? parts[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const part = parts.find((p) => p.id === (initialPartId ?? partId));
  const pid = initialPartId ?? partId;
  const rid = fixedRequestId ?? requestId;

  const submit = () => {
    if (!rid) return setErr("Select one of your open jobs.");
    if (!part) return setErr("Select a part.");
    if (!(qty >= 1)) return setErr("Quantity must be at least 1.");
    if (qty > part.quantity) return setErr(`Only ${part.quantity} in stock.`);
    const result = onSubmit(rid, pid, qty, note.trim());
    if (!result.ok) return setErr(result.error ?? "Unable to request parts.");
    setQty(1);
    setNote("");
    setErr("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Part"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit}>Submit Request</Button></>}
    >
      <div className="space-y-4">
        {!fixedRequestId && (
          <Field label="Job" required>
            <Select value={requestId} onChange={(e) => { setRequestId(e.target.value); setErr(""); }}>
              {jobs.length === 0 && <option value="">No open jobs</option>}
              {jobs.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.serviceType} · {vehicleLabel(vehicles.find((v) => v.id === r.vehicleId))}</option>)}
            </Select>
          </Field>
        )}
        {!initialPartId ? (
          <Field label="Part" required>
            <Select value={partId} onChange={(e) => { setPartId(e.target.value); setErr(""); }}>
              {parts.map((p) => <option key={p.id} value={p.id} disabled={p.quantity === 0}>{p.name} — {p.quantity} in stock</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="Part"><Input value={`${part?.name ?? ""} — ${part?.quantity ?? 0} in stock`} readOnly /></Field>
        )}
        <Field label="Quantity" required><Input type="number" min={1} value={qty} onChange={(e) => { setQty(Math.floor(+e.target.value)); setErr(""); }} /></Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>
        {err && <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{err}</div>}
      </div>
    </Modal>
  );
}

/* ============ Parts (technician: view + request; no editing) ============ */
export function TechParts() {
  const { parts, partRequests, myTechId, requests, requestPart } = useApp();
  const t = useTableData(parts, (p) => [p.name, p.number, p.category, p.price].join(" "));
  const mine = partRequests.filter((p) => p.technicianId === myTechId);
  const mt = useTableData(mine, (p) => [p.requestId, parts.find((x) => x.id === p.partId)?.name ?? "", p.status, p.note].join(" "));
  const [reqPart, setReqPart] = useState<string | null>(null);
  const hasJobs = !!myTechId && requests.some((r) => r.technicianId === myTechId && r.stage !== "Completed");
  return (
    <>
      <PageHeader title="Parts" subtitle="Check availability and request parts for your assigned jobs." />
      <Card>
        <TableSearch t={t} placeholder="Search parts by name or number..." />
        <Table>
          <Thead cols={["Part Name", "Part Number", "Category", "In Stock", "Unit Price", ""]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={6} />}
            {t.rows.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium text-ink-900">{p.name}</Td>
                <Td><span className="font-mono text-[13px] text-ink-500">{p.number}</span></Td>
                <Td>{p.category}</Td>
                <Td>
                  <span className={`tabular font-medium ${p.quantity === 0 ? "text-bad-700" : p.quantity < 10 ? "text-warn-700" : "text-ink-700"}`}>{p.quantity}</span>
                  {p.quantity < 10 && <span className="ml-2"><StatusBadge status={p.quantity === 0 ? "Out of Stock" : "Low Stock"} /></span>}
                </Td>
                <Td className="tabular">{money(p.price)}</Td>
                <Td>
                  <Button size="sm" variant="secondary" disabled={!hasJobs || p.quantity === 0} onClick={() => setReqPart(p.id)}>Request</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination t={t} />
      </Card>

      <Card className="mt-5">
        <CardHeader title="My Part Requests" />
        <TableSearch t={mt} />
        <Table>
          <Thead cols={["Job", "Part", "Qty", "Requested", "Status"]} />
          <tbody>
            {mt.rows.length === 0 && <NoRows cols={5} />}
            {mt.rows.map((p) => (
              <Tr key={p.id}>
                <Td><Link to={`/technician/work-orders/${p.requestId}`} className="font-mono text-[13px] font-medium text-brand-600 hover:underline">{p.requestId}</Link></Td>
                <Td className="text-ink-900">{parts.find((x) => x.id === p.partId)?.name}</Td>
                <Td className="tabular">{p.qty}</Td>
                <Td className="text-[13px] tabular">{p.at}</Td>
                <Td><StatusBadge status={p.status} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination t={mt} />
      </Card>

      {reqPart && <PartRequestModal open onClose={() => setReqPart(null)} initialPartId={reqPart} onSubmit={requestPart} />}
    </>
  );
}

/* ============ Weekly Time Log (technician: own; admin: all) ============ */
export function TimeLog() {
  const { timeLogs, technicians, requests, vehicles, myTechId, isAdmin, assignments, addTimeLog, removeTimeLog } = useApp();
  const q = useQuery();
  const canLog = !!myTechId;
  const [monday, setMonday] = useState(() => startOfWeek(q.get("week") ? fromIso(q.get("week")!) : new Date()));
  const [tech, setTech] = useState(q.get("tech") ?? (isAdmin ? "all" : myTechId ?? ""));
  const [day, setDay] = useState<string | null>(null);
  const days = weekDays(monday);
  const from = iso(days[0]);
  const to = iso(days[6]);
  const thisWeek = iso(startOfWeek(new Date())) === from;

  const visible = timeLogs.filter((l) => (isAdmin ? tech === "all" || l.technicianId === tech : l.technicianId === myTechId));
  const week = visible.filter((l) => l.date >= from && l.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const daily = days.map((d, i) => ({ label: DAY_NAMES[i], value: week.filter((l) => l.date === iso(d)).reduce((a, b) => a + b.hours, 0) }));
  const total = week.reduce((a, b) => a + b.hours, 0);
  const daysWorked = daily.filter((d) => d.value > 0).length;
  const rows = day ? week.filter((l) => l.date === day) : week;
  const techName = (id: string) => technicians.find((t) => t.id === id)?.name ?? "—";
  const t = useTableData(rows, (l) => [l.date, l.requestId, l.vehicle, l.task, l.hours, techName(l.technicianId)].join(" "));

  const myJobs = myTechId ? requests.filter((r) => r.technicianId === myTechId && r.stage !== "Completed" && !assignments.some((a) => a.requestId === r.id && a.status === "On Hold")) : [];
  const [open, setOpen] = useState(false);
  const blank = () => ({ requestId: myJobs.find((r) => r.stage !== "Completed")?.id ?? myJobs[0]?.id ?? "", task: "", date: thisWeek ? iso(new Date()) : from, hours: 1 });
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const save = () => {
    const r = myJobs.find((x) => x.id === form.requestId);
    if (!r) return setErr("Select one of your jobs.");
    if (!form.task.trim()) return setErr("Describe the task.");
    if (!form.date) return setErr("Choose a date.");
    if (form.date > iso(new Date())) return setErr("You can't log hours in the future.");
    if (!(form.hours > 0 && form.hours <= 16)) return setErr("Hours must be between 0 and 16.");
    const result = addTimeLog({ requestId: r.id, vehicle: vehicleLabel(vehicles.find((v) => v.id === r.vehicleId)), task: form.task.trim(), date: form.date, hours: form.hours });
    if (!result.ok) return setErr(result.error ?? "Unable to log time.");
    setMonday(startOfWeek(fromIso(form.date)));
    setOpen(false);
  };
  const go = (n: number) => { setMonday(addDays(monday, n * 7)); setDay(null); t.setPage(1); };
  const showTech = isAdmin;

  return (
    <>
      <PageHeader
        title={isAdmin ? "Time Logs" : "Time Log"}
        subtitle={isAdmin ? "Review weekly hours logged by technicians." : "Track the hours you spend on each job."}
        action={canLog ? <Button onClick={() => { setForm(blank()); setErr(""); setOpen(true); }}><IconPlus size={16} /> Log Time</Button> : undefined}
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={() => go(-1)} aria-label="Previous week"><IconChevronRight size={15} className="rotate-180" /> Prev</Button>
          <Button size="sm" variant="secondary" onClick={() => go(1)} aria-label="Next week">Next <IconChevronRight size={15} /></Button>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900 tabular">{fmtRange(days[0], days[6])}</p>
          <p className="text-[12px] text-ink-400">Monday – Sunday</p>
        </div>
        <Input type="date" value={from} onChange={(e) => e.target.value && (setMonday(startOfWeek(fromIso(e.target.value))), setDay(null))} className="!h-9 max-w-[170px]" aria-label="Pick a week" />
        {!thisWeek && <Button size="sm" variant="ghost" onClick={() => { setMonday(startOfWeek(new Date())); setDay(null); }}>This week</Button>}
        {isAdmin && (
          <Select value={tech} onChange={(e) => { setTech(e.target.value); t.setPage(1); }} className="!h-9 max-w-[220px] sm:ml-auto" aria-label="Technician">
            <option value="all">All technicians</option>
            {technicians.map((x) => <option key={x.id} value={x.id}>{x.name}{x.id === myTechId ? " (me)" : ""}</option>)}
          </Select>
        )}
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard icon={<IconClock />} label="Weekly Hours" value={total.toFixed(1)} sub={fmtRange(days[0], days[6])} />
        <StatCard icon={<IconClipboard />} label="Entries" value={week.length} sub="This week" tone="ok" />
        <StatCard icon={<IconCheck />} label="Days Worked" value={daysWorked} sub="of 7" tone="warn" />
        <StatCard icon={<IconWrench />} label="Avg / Day" value={(total / Math.max(daysWorked, 1)).toFixed(1)} sub="Hours on worked days" />
      </div>

      <Card className="mb-5">
        <CardHeader title="Daily Hours" action={day ? <Button size="sm" variant="ghost" onClick={() => setDay(null)}>Show all days</Button> : <span className="text-[12px] text-ink-400">Click a day to filter entries</span>} />
        <div className="p-5">
          <BarChart data={daily} format={(v) => v.toFixed(1)} onSelect={(i) => { setDay(iso(days[i])); t.setPage(1); }} />
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {days.map((d, i) => {
              const sel = day === iso(d);
              return (
                <button key={i} onClick={() => { setDay(sel ? null : iso(d)); t.setPage(1); }} className={`rounded-lg px-1 py-1.5 text-[11px] transition-colors ${sel ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-slate-100"}`}>
                  <span className="block font-semibold">{DAY_NAMES[i]}</span>
                  <span className="block tabular">{fmtDay(d)}</span>
                  <span className="block font-mono tabular">{daily[i].value.toFixed(1)}h</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <TableSearch t={t} />
        <Table>
          <Thead cols={["Date", ...(showTech ? ["Technician"] : []), "Request ID", "Vehicle", "Task", "Hours", ""]} />
          <tbody>
            {t.rows.length === 0 && <NoRows cols={showTech ? 7 : 6} />}
            {t.rows.map((l) => (
              <Tr key={l.id}>
                <Td className="tabular">{DAY_NAMES[(fromIso(l.date).getDay() + 6) % 7]}, {fmtDay(fromIso(l.date))}</Td>
                {showTech && <Td className="text-ink-900">{techName(l.technicianId)}</Td>}
                <Td><span className="font-mono text-[13px] font-medium text-brand-600">{l.requestId}</span></Td>
                <Td className="text-ink-900">{l.vehicle}</Td>
                <Td>{l.task}</Td>
                <Td className="font-medium text-ink-900 tabular">{l.hours.toFixed(1)}</Td>
                <Td className="w-12">
                  {l.technicianId === myTechId && (
                    <button onClick={() => removeTimeLog(l.id)} aria-label="Delete entry" className="grid h-8 w-8 place-items-center rounded-lg text-bad-500 hover:bg-bad-50"><IconTrash size={16} /></button>
                  )}
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
        title="Log Time"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save Entry</Button></>}
      >
        <div className="space-y-4">
          <Field label="Job" required>
            <Select value={form.requestId} onChange={(e) => { setForm({ ...form, requestId: e.target.value }); setErr(""); }}>
              {myJobs.length === 0 && <option value="">No assigned jobs</option>}
              {myJobs.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.serviceType} ({r.stage})</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" required><Input type="date" value={form.date} max={iso(new Date())} onChange={(e) => { setForm({ ...form, date: e.target.value }); setErr(""); }} /></Field>
            <Field label="Hours" required><Input type="number" step="0.25" min={0.25} value={form.hours} onChange={(e) => { setForm({ ...form, hours: +e.target.value }); setErr(""); }} /></Field>
          </div>
          <Field label="Task" required><Input value={form.task} onChange={(e) => { setForm({ ...form, task: e.target.value }); setErr(""); }} placeholder="Describe the task" /></Field>
          {err && <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{err}</div>}
        </div>
      </Modal>
    </>
  );
}
