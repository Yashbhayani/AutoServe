import { useEffect, useState, type ReactNode, type FormEvent } from "react"
import { shop, type PartRow, type PriceRow } from "../api/shop"
import { useRemote } from "../hooks/useRemote"
import { useNotifications } from "../store/NotificationsContext"
import { useApp } from "../store/AppContext"
import { useLocation } from "../router"
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Modal,
  PageHeader,
  StatCard,
  StatusBadge,
  money,
} from "../components/ui"
import { DonutChart, LineChart } from "../components/charts"
import { IconBox, IconChart } from "../components/icons"
import { csvDocument, dailySeries } from "../lib/reporting"

const message = (e: unknown) =>
  e instanceof Error ? e.message : "The operation failed. Please try again."
export function DataState({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: string
  retry: () => void
}) {
  return loading ? (
    <p role="status" className="py-8 text-sm text-ink-500">
      Loading…
    </p>
  ) : error ? (
    <div
      role="alert"
      className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      {error}{" "}
      <Button variant="secondary" onClick={retry}>
        Retry
      </Button>
    </div>
  ) : null
}
export function GridTable({
  headers,
  rows,
  empty = "No records found.",
}: {
  headers: string[]
  rows: ReactNode[][]
  empty?: string
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-ink-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length ? (
            rows.map((cells, i) => (
              <tr key={i}>
                {cells.map((c, j) => (
                  <td key={j} className="px-5 py-3 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-5 py-8 text-center text-ink-400"
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
export function Pager({
  page,
  total,
  size = 10,
  onChange,
}: {
  page: number
  total: number
  size?: number
  onChange: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / size))
  return (
    <div className="flex items-center justify-between gap-3 p-4 text-sm text-ink-500">
      <span>
        {total} records · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
function useRange() {
  const [range, setRange] = useState(() => {
    const end = new Date(),
      start = new Date()
    start.setDate(start.getDate() - 29)
    return { from: localDate(start), to: localDate(end) }
  })
  const [draft, setDraft] = useState(range),
    [error, setError] = useState("")
  const controls = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const days = (Date.parse(draft.to) - Date.parse(draft.from)) / 86400000
        if (
          !draft.from ||
          !draft.to ||
          !Number.isFinite(days) ||
          days < 0 ||
          days > 366
        ) {
          setError("Choose a valid date range of at most 367 days.")
          return
        }
        setError("")
        setRange(draft)
      }}
      className="mb-6 flex flex-wrap items-end gap-3"
    >
      <Field label="From">
        <Input
          required
          type="date"
          value={draft.from}
          onChange={(e) => setDraft({ ...draft, from: e.target.value })}
        />
      </Field>
      <Field label="Through">
        <Input
          required
          type="date"
          value={draft.to}
          onChange={(e) => setDraft({ ...draft, to: e.target.value })}
        />
      </Field>
      <Button type="submit">Apply dates</Button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  )
  return { ...range, controls }
}
function Dashboard({ role }: { role: string }) {
  const range = useRange()
  const remote = useRemote(
    () => shop.dashboard(role, range.from, range.to),
    [role, range.from, range.to],
  )
  const d = remote.data
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Current workload and activity from your service center."
        action={
          <Button variant="secondary" onClick={remote.refresh}>
            Refresh
          </Button>
        }
      />
      {range.controls}
      <DataState {...remote} retry={remote.refresh} />
      {d && (
        <div className="space-y-6">
          <p className="text-xs text-ink-500">
            Period: {d.from} through {d.to}. Active counts, status totals and
            recent records show the current state.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(d.summary).filter(([label]) => !/hours/i.test(label)).map(([label, value]) => (
              <StatCard
                key={label}
                icon={<IconChart />}
                label={label}
                value={Number(value).toLocaleString()}
              />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Requests created in period" />
              <div className="p-5">
                <LineChart data={dailySeries(d.from, d.to, d.activity)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Current request statuses" />
              <div className="p-5">
                {d.statuses.length ? (
                  <DonutChart
                    segments={d.statuses.map((x, i) => ({
                      ...x,
                      value: Number(x.value),
                      color: ["#2563eb", "#0891b2", "#7c3aed", "#d97706", "#16a34a", "#dc2626", "#64748b"][i % 7],
                    }))}
                  />
                ) : (
                  <p className="text-sm text-ink-400">No service requests.</p>
                )}
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader title="Recent service requests (latest 20)" />
            <GridTable
              headers={[
                "Request / work order",
                "Vehicle",
                "Description",
                "Status",
                "Created",
              ]}
              rows={d.requests.map((r) => [
                `#${r.id}${r.work_order_id ? ` / #${r.work_order_id}` : ""}`,
                r.vehicle,
                <span className="block max-w-xs whitespace-pre-wrap">
                  {r.description}
                </span>,
                <StatusBadge status={r.status} />,
                r.created_at.slice(0, 10),
              ])}
            />
          </Card>
          <Card>
            <CardHeader title="Upcoming appointments (next 10)" />
            <GridTable
              headers={["Appointment", "Request", "Date", "Time", "Status"]}
              rows={d.appointments.map((a) => [
                `#${a.id}`,
                `#${a.service_request_id}`,
                a.scheduled_date.slice(0, 10),
                a.scheduled_time?.slice(0, 5) || "—",
                <StatusBadge status={a.status} />,
              ])}
            />
          </Card>
        </div>
      )}
    </>
  )
}
export const AdminDashboard = () => <Dashboard role="admin" />
export const CustomerDashboard = () => <Dashboard role="customer" />
export const TechDashboard = () => <Dashboard role="technician" />

export function Reports() {
  const range = useRange(),
    remote = useRemote(
      () => shop.report(range.from, range.to),
      [range.from, range.to],
    )
  const [page, setPage] = useState(1)
  const d = remote.data
  function download() {
    if (!d) return
    const rows: unknown[][] = [
      ["AutoServe report", d.from, d.to],
      [],
      ["Metric", "Value"],
      ...Object.entries(d.summary).filter(([label]) => !/hours/i.test(label)),
      [],
      ["Collection date", "Successful payments"],
      ...dailySeries(d.from, d.to, d.revenue).map((x) => [x.month, x.value]),
      [],
      ["Requested service", "Request count"],
      ...d.services.map((s) => [s.label, s.value]),
      [],
      ["Technician ID", "Technician", "Completed jobs"],
      ...d.technicians.map((t) => [t.id, t.name, t.completed]),
      [],
      [
        "Invoice",
        "Work order",
        "Created",
        "Status",
        "Amount",
        "Lifetime successful payments",
      ],
      ...d.invoices.map((i) => [
        i.id,
        i.work_order_id,
        i.created_at,
        i.status,
        i.amount,
        i.collected,
      ]),
    ]
    const url = URL.createObjectURL(
      new Blob([csvDocument(rows)], { type: "text/csv;charset=utf-8;" }),
    )
    const a = document.createElement("a")
    a.href = url
    a.download = `autoserve-report-${d.from}-${d.to}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Payments, service demand, technician activity, and invoices."
        action={
          <Button disabled={!d || remote.loading} onClick={download}>
            Export CSV
          </Button>
        }
      />
      {range.controls}
      <DataState {...remote} retry={remote.refresh} />
      {d && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(d.summary).filter(([label]) => !/hours/i.test(label)).map(([label, value]) => (
              <StatCard
                key={label}
                icon={<IconChart />}
                label={label}
                value={
                  label === "Collected payments"
                    ? money(Number(value))
                    : Number(value).toLocaleString()
                }
              />
            ))}
          </div>
          <p className="text-xs text-ink-500">
            Collection dates use successful payments only. Service counts include each selected
            service once per request. Invoice rows use invoice creation dates;
            their collected amount covers all successful payments to date.
          </p>
          <Card>
            <CardHeader title="Collected payments by day" />
            <div className="p-5">
              <LineChart data={dailySeries(d.from, d.to, d.revenue)} format={value => money(value)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Service demand" />
            <GridTable
              headers={["Service", "Requests in period"]}
              rows={d.services.map((s) => [s.label, s.value])}
            />
          </Card>
          <Card>
            <CardHeader title="Technician activity" />
            <GridTable
              headers={["Technician", "Jobs completed"]}
              rows={d.technicians.map((t) => [t.name, t.completed])}
            />
          </Card>
          <Card>
            <CardHeader title="Invoices created in period" />
            <GridTable
              headers={[
                "Invoice / work order",
                "Created",
                "Status",
                "Amount",
                "Collected to date",
              ]}
              rows={d.invoices
                .slice(
                  (Math.min(
                    page,
                    Math.max(1, Math.ceil(d.invoices.length / 10)),
                  ) -
                    1) *
                    10,
                  Math.min(
                    page,
                    Math.max(1, Math.ceil(d.invoices.length / 10)),
                  ) * 10,
                )
                .map((i) => [
                  `#${i.id} / #${i.work_order_id}`,
                  i.created_at.slice(0, 10),
                  <StatusBadge status={i.status} />,
                  money(Number(i.amount)),
                  money(Number(i.collected)),
                ])}
            />
            <Pager
              page={Math.min(
                page,
                Math.max(1, Math.ceil(d.invoices.length / 10)),
              )}
              total={d.invoices.length}
              onChange={setPage}
            />
          </Card>
        </div>
      )}
    </>
  )
}

export function NotificationsPage() {
  const notes = useNotifications(),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const remote = useRemote(
    () => shop.notes(filter, page, 20),
    [filter, page, notes.revision],
  )
  useEffect(() => {
    if (remote.data) { const last = Math.max(1, Math.ceil(remote.data.total / 20)); if (page > last) setPage(last); }
  }, [remote.data, page]);
  async function mark(id?: number) {
    setBusy(true)
    setError("")
    try {
      await notes.markRead(id)
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${notes.data.unreadCount} unread notifications`}
        action={
          <Button
            disabled={busy || !notes.data.unreadCount}
            onClick={() => void mark()}
          >
            Mark all read
          </Button>
        }
      />
      <div className="mb-5 flex gap-3">
        <Select
          aria-label="Notification filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">All notifications</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </Select>
        <Button variant="secondary" onClick={notes.refresh}>
          Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <DataState {...remote} retry={remote.refresh} />
      {remote.data && (
        <Card>
          <div className="divide-y divide-line">
            {remote.data.items.length ? (
              remote.data.items.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-4 p-5 ${
                    n.is_read ? "" : "bg-brand-50/50"
                  }`}
                >
                  <div>
                    <p className="text-xs text-ink-400">
                      {n.type} · {n.created_at.replace("T", " ")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void mark(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-ink-400">
                No notifications in this view.
              </p>
            )}
          </div>
          <Pager
            page={page}
            size={20}
            total={remote.data.total}
            onChange={setPage}
          />
        </Card>
      )}
    </>
  )
}

function PartsScreen({ admin }: { admin: boolean }) {
  const { availableRoles } = useApp(),
    notes = useNotifications()
  const remote = useRemote(async () => {
    const [parts, categories, requests, jobs, archivedParts] = await Promise.all([
      shop.parts(),
      shop.categories(),
      shop.requests(),
      availableRoles.includes("technician") ? shop.jobs() : Promise.resolve([]),
      admin ? shop.archivedParts() : Promise.resolve([]),
    ])
    return { parts, categories, requests, jobs, archivedParts }
  }, [admin])
  const { search: query } = useLocation()
  const initial = new URLSearchParams(query).get("filter")
  const [tab, setTab] = useState(initial === "requests" ? "requests" : "parts"),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [low, setLow] = useState(initial === "low"),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1)
  const [edit, setEdit] = useState<Partial<PartRow> | null>(null),
    [archive, setArchive] = useState<PartRow | null>(null),
    [request, setRequest] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("")
  const [history, setHistory] = useState<PartRow | null>(null)
  const historyData = useRemote<PriceRow[]>(
    () => (history ? shop.prices(history.id) : Promise.resolve([])),
    [history?.id],
  )
  async function mutate(
    action: () => Promise<unknown>,
    done: () => void,
    text: string,
  ) {
    if (busy) return
    setBusy(true)
    setError("")
    setSuccess("")
    try {
      await action()
      done()
      setSuccess(text)
      remote.refresh()
      notes.refresh()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  const d = remote.data
  const parts =
    (tab === "archived" ? d?.archivedParts : d?.parts)?.filter(
      (p) =>
        (category === "all" || String(p.category_id) === category) &&
        (!low || p.stock_quantity <= p.reorder_level) &&
        `${p.name} ${p.sku} ${p.code}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? []
  const requests =
    d?.requests.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        `${r.id} ${r.work_order_id} ${r.part_name} ${r.technician_name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? []
  const total = tab !== "requests" ? parts.length : requests.length,
    current = Math.min(page, Math.max(1, Math.ceil(total / 10)))
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const quantity = Number(form.get("quantity")),
      reorder = Number(form.get("reorder")),
      price = Number(form.get("price"))
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      !Number.isSafeInteger(reorder) ||
      reorder < 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 0.00001
    ) {
      setError(
        "Enter nonnegative whole stock values and a price with at most two decimal places.",
      )
      return
    }
    void mutate(
      () =>
        shop.savePart(edit?.id, {
          name: form.get("name"),
          code: form.get("code"),
          sku: form.get("sku"),
          categoryId: Number(form.get("category")),
          stockQuantity: quantity,
          expectedStockQuantity: edit?.stock_quantity,
          reorderLevel: reorder,
          unitPrice: price,
        }),
      () => setEdit(null),
      "Part saved.",
    )
  }
  function submitRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget),
      quantity = Number(f.get("quantity"))
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Enter a positive whole quantity.")
      return
    }
    void mutate(
      () =>
        shop.requestPart({
          workOrderId: Number(f.get("job")),
          partId: Number(f.get("part")),
          quantity,
          note: f.get("note"),
        }),
      () => setRequest(false),
      "Part request submitted for review.",
    )
  }
  const formError = error && (
    <p role="alert" className="mb-4 text-sm text-red-700">
      {error}
    </p>
  )
  return (
    <>
      <PageHeader
        title={admin ? "Inventory" : "Parts"}
        subtitle={
          admin
            ? "Manage stock, pricing, and technician requests."
            : "Browse stock and request parts for your assigned work orders."
        }
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={remote.refresh}>
              Refresh
            </Button>
            {admin ? (
              <Button
                disabled={!d}
                onClick={() => {
                  setError("")
                  setEdit({})
                }}
              >
                Add part
              </Button>
            ) : (
              <Button
                disabled={!d?.jobs.length || !d.parts.length}
                onClick={() => {
                  setError("")
                  setRequest(true)
                }}
              >
                Request part
              </Button>
            )}
          </div>
        }
      />
      {!edit && !archive && !request && formError}
      {success && (
        <p role="status" className="mb-4 text-sm text-green-700">
          {success}
        </p>
      )}
      <DataState {...remote} retry={remote.refresh} />
      {d && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<IconBox />}
              label="Active parts"
              value={d.parts.length}
            />
            <StatCard
              icon={<IconBox />}
              label="Low stock parts"
              value={
                d.parts.filter((p) => p.stock_quantity <= p.reorder_level)
                  .length
              }
            />
            <StatCard
              icon={<IconBox />}
              label="Pending requests"
              value={d.requests.filter((r) => r.status === "Pending").length}
            />
          </div>
          {!admin && !d.jobs.length && (
            <p className="text-sm text-ink-500">
              You have no open assigned work orders eligible for part requests.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tab === "parts" ? "primary" : "secondary"}
              onClick={() => {
                setTab("parts")
                setPage(1)
              }}
            >
              Parts
            </Button>
            {admin && <Button variant={tab === "archived" ? "primary" : "secondary"} onClick={() => {setTab("archived");setPage(1);setLow(false);}}>Archived parts ({d.archivedParts.length})</Button>}
            <Button
              variant={tab === "requests" ? "primary" : "secondary"}
              onClick={() => {
                setTab("requests")
                setPage(1)
              }}
            >
              {admin ? "Technician requests" : "My requests"}
            </Button>
            {admin && availableRoles.includes("technician") && (
              <Button
                variant="secondary"
                disabled={!d.jobs.length}
                onClick={() => {
                  setError("")
                  setRequest(true)
                }}
              >
                Request for my job
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              aria-label="Search inventory"
              placeholder={
                tab !== "requests"
                  ? "Search name, SKU or code"
                  : "Search request, job, part or technician"
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {tab !== "requests" ? (
              <>
                <Select
                  aria-label="Part category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="all">All categories</option>
                  {d.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={low}
                    onChange={(e) => {
                      setLow(e.target.checked)
                      setPage(1)
                    }}
                  />
                  Low stock only
                </label>
              </>
            ) : (
              <Select
                aria-label="Request status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All statuses</option>
                {["Pending", "Issued", "Rejected"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </div>
          <Card>
            {tab !== "requests" ? (
              <GridTable
                headers={[
                  "Part / SKU",
                  "Category",
                  "Stock / reorder at",
                  "Unit price",
                  "Actions",
                ]}
                rows={parts.slice((current - 1) * 10, current * 10).map((p) => [
                  <>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink-400">
                      {p.sku} · {p.code}
                    </p>
                  </>,
                  p.category_name,
                  <span
                    className={
                      p.stock_quantity <= p.reorder_level
                        ? "font-semibold text-red-700"
                        : ""
                    }
                  >
                    {p.stock_quantity} / {p.reorder_level}
                  </span>,
                  money(Number(p.unit_price)),
                  <div className="flex flex-wrap gap-2">
                    {tab !== "archived" && <Button variant="secondary" onClick={() => setHistory(p)}>
                      Prices
                    </Button>}
                    {admin && tab === "archived" ? <Button disabled={busy} onClick={() => void mutate(() => shop.restorePart(p.id), () => {}, "Part restored with its previous stock and price.")}>Restore</Button> : admin && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setError("")
                            setEdit(p)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setError("")
                            setArchive(p)
                          }}
                        >
                          Archive
                        </Button>
                      </>
                    )}
                  </div>,
                ])}
              />
            ) : (
              <GridTable
                headers={[
                  "Request / job",
                  "Part",
                  "Quantity",
                  "Technician",
                  "Status",
                  "Note",
                  "Actions",
                ]}
                rows={requests
                  .slice((current - 1) * 10, current * 10)
                  .map((r) => [
                    <>
                      <p>
                        #{r.id} / #{r.work_order_id}
                      </p>
                      <p className="text-xs text-ink-400">
                        {r.created_at.slice(0, 10)}
                      </p>
                    </>,
                    r.part_name,
                    r.quantity,
                    r.technician_name,
                    <StatusBadge status={r.status} />,
                    <span className="block max-w-xs whitespace-pre-wrap">
                      {r.note || "—"}
                    </span>,
                    admin && r.status === "Pending" ? (
                      <div className="flex gap-2">
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              () => shop.resolvePart(r.id, "Issued"),
                              () => {},
                              "Parts issued and stock updated.",
                            )
                          }
                        >
                          Issue
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              () => shop.resolvePart(r.id, "Rejected"),
                              () => {},
                              "Request rejected.",
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      "—"
                    ),
                  ])}
              />
            )}
            <Pager page={current} total={total} onChange={setPage} />
          </Card>
        </div>
      )}
      <Modal
        open={edit !== null}
        onClose={() => {
          if (!busy) setEdit(null)
        }}
        title={edit?.id ? "Edit part" : "Add part"}
      >
        {edit && (
          <form key={edit.id ?? "new"} onSubmit={save}>
            {formError}
            <div className="space-y-4">
              <Field label="Part name">
                <Input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={edit.name}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code">
                  <Input
                    name="code"
                    required
                    maxLength={50}
                    defaultValue={edit.code}
                  />
                </Field>
                <Field label="SKU">
                  <Input
                    name="sku"
                    required
                    maxLength={50}
                    defaultValue={edit.sku}
                  />
                </Field>
              </div>
              <Field label="Category">
                <Select
                  name="category"
                  required
                  defaultValue={edit.category_id ?? ""}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {d?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Stock">
                  <Input
                    name="quantity"
                    type="number"
                    required
                    min={0}
                    max={2147483647}
                    step={1}
                    defaultValue={edit.stock_quantity ?? 0}
                  />
                </Field>
                <Field label="Reorder at">
                  <Input
                    name="reorder"
                    type="number"
                    required
                    min={0}
                    max={2147483647}
                    step={1}
                    defaultValue={edit.reorder_level ?? 5}
                  />
                </Field>
                <Field label="Price ($)">
                  <Input
                    name="price"
                    type="number"
                    required
                    min={0}
                    max={99999999.99}
                    step="0.01"
                    defaultValue={edit.unit_price ?? 0}
                  />
                </Field>
              </div>
              <p className="text-xs text-ink-400">
                Price changes retain previous prices in history. Stock is the
                current physical quantity.
              </p>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save part"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={archive !== null}
        onClose={() => {
          if (!busy) setArchive(null)
        }}
        title="Archive part"
      >
        {formError}
        <p className="mb-5 text-sm">
          Archive {archive?.name}? Existing usage and price history will be
          retained. Pending requests must be resolved first.
        </p>
        <Button
          disabled={busy}
          onClick={() =>
            archive &&
            void mutate(
              () => shop.archivePart(archive.id),
              () => setArchive(null),
              "Part archived.",
            )
          }
        >
          Archive part
        </Button>
      </Modal>
      <Modal
        open={request}
        onClose={() => {
          if (!busy) setRequest(false)
        }}
        title="Request parts"
      >
        <form onSubmit={submitRequest} className="space-y-4">
          {formError}
          <Field label="Assigned work order">
            <Select name="job" required defaultValue="">
              <option value="" disabled>
                Select work order
              </option>
              {d?.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  #{j.id} · {j.status} · {j.description.slice(0, 70)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Part">
            <Select name="part" required defaultValue="">
              <option value="" disabled>
                Select part
              </option>
              {d?.parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.sku} · {p.stock_quantity} available
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity">
            <Input
              name="quantity"
              required
              type="number"
              min={1}
              max={2147483647}
              step={1}
              defaultValue={1}
            />
          </Field>
          <Field label="Note (optional)">
            <Input name="note" maxLength={500} />
          </Field>
          <p className="text-xs text-ink-400">
            An administrator will issue the parts when stock is available.
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </form>
      </Modal>
      <Modal
        open={history !== null}
        onClose={() => setHistory(null)}
        title={`Price history · ${history?.name ?? ""}`}
      >
        <DataState {...historyData} retry={historyData.refresh} />
        {historyData.data && (
          <GridTable
            headers={["Price", "From", "Through"]}
            rows={historyData.data.map((p) => [
              money(Number(p.unit_price)),
              p.effective_from.replace("T", " "),
              p.effective_to?.replace("T", " ") || "Current",
            ])}
          />
        )}
      </Modal>
    </>
  )
}
export const Inventory = () => <PartsScreen admin />
export const TechParts = () => <PartsScreen admin={false} />
