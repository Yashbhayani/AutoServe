import { useState, type FormEvent, type ReactNode } from "react"
import { operations, type Row, type OperationsData } from "../api/operations"
import { apiRequest } from "../api/request"
import { useRemote } from "../hooks/useRemote"
import { useApp } from "../store/AppContext"
import { useNotifications } from "../store/NotificationsContext"
import { useLogicalPath, useNavigate, Link, slugify } from "../router"
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Textarea,
  Select,
  Modal,
  PageHeader,
  StageTracker,
  StatusBadge,
  money,
} from "../components/ui"
import { DataState, GridTable, Pager } from "./live"
import { downloadInvoice } from "../lib/invoice"
import { STAGES } from "../lib/constants"

type FieldSpec = {
  key: string
  label: string
  type?: string
  required?: boolean
  value?: string | number
  options?: { value: string | number; label: string }[]
  max?: number
  min?: number | string
  step?: string
}
function OperationForm({
  fields,
  submit,
  label,
  busy,
  children,
  validate,
}: {
  fields: FieldSpec[]
  submit: (body: Record<string, unknown>) => void
  label: string
  busy: boolean
  children?: ReactNode
  validate?: (body: Record<string, unknown>) => string | null
}) {
  const [formError, setFormError] = useState("")
  function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const error = validate?.(data) ?? null
    if (error) {
      setFormError(error)
      return
    }
    setFormError("")
    submit(data)
  }
  return (
    <form onSubmit={send} className="space-y-4">
      {fields.map((f) => (
        <Field key={f.key} label={f.label} required={f.required}>
          {f.options ? (
            <Select
              name={f.key}
              required={f.required}
              defaultValue={f.value ?? ""}
            >
              <option value="" disabled>
                Select…
              </option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : f.type === "textarea" ? (
            <Textarea
              name={f.key}
              required={f.required}
              maxLength={f.max ?? 5000}
              defaultValue={f.value}
            />
          ) : (
            <Input
              name={f.key}
              required={f.required}
              type={f.type ?? "text"}
              min={f.min}
              max={f.type === "number" ? f.max : undefined}
              maxLength={f.type !== "number" ? (f.max ?? 500) : undefined}
              step={f.step ?? (f.type === "number" ? "1" : undefined)}
              defaultValue={f.value}
            />
          )}
        </Field>
      ))}
      {children}
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
    </form>
  )
}
function useOperations() {
  const remote = useRemote(operations.load),
    notifications = useNotifications()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("")
  async function act(
    action: string,
    body: Record<string, unknown>,
    after?: (result: { id: number; requestId: number }) => void,
  ) {
    if (busy) return
    setBusy(true)
    setError("")
    setSuccess("")
    try {
      const result = await operations.act(action, body)
      setSuccess("Saved successfully.")
      await after?.(result)
      remote.refresh()
      notifications.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.")
    } finally {
      setBusy(false)
    }
  }
  return { ...remote, busy, error: error || remote.error, success, act }
}
function Frame({
  remote,
  title,
  subtitle,
  action,
  children,
}: {
  remote: ReturnType<typeof useOperations>
  title: string
  subtitle?: string
  action?: ReactNode
  children: (d: OperationsData) => ReactNode
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} action={action} />
      {remote.success && (
        <p role="status" className="mb-4 text-sm text-green-700">
          {remote.success}
        </p>
      )}
      <DataState
        loading={remote.loading}
        error={remote.error}
        retry={remote.refresh}
      />
      {remote.data && children(remote.data)}
    </>
  )
}
function SearchTable({
  headers,
  rows,
  searchText,
}: {
  headers: string[]
  rows: ReactNode[][]
  searchText: string[]
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1)
  const filtered = rows.filter((_, i) =>
    searchText[i].toLowerCase().includes(search.toLowerCase()),
  )
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)))
  return (
    <Card>
      <div className="p-4">
        <Input
          aria-label="Search records"
          placeholder="Search records"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
      </div>
      <GridTable
        headers={headers}
        rows={filtered.slice((current - 1) * 10, current * 10)}
      />
      <Pager page={current} total={filtered.length} onChange={setPage} />
    </Card>
  )
}
const label = (v: Row) => `${v.year} ${v.make} ${v.model}`
const localDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
const identity = (path: string) => path.split("/").filter(Boolean).at(-1) ?? ""
const appointmentTimeOptions = Array.from({ length: 17 }, (_, index) => {
  const minutes = 9 * 60 + index * 30
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour < 12 ? "AM" : "PM"
  const displayHour = hour % 12 || 12
  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    label: `${displayHour}:${String(minute).padStart(2, "0")} ${period}`,
  }
})
export function appointmentSlotError(body: Record<string, unknown>) {
  const date = String(body.date ?? "")
  if (!date) return null
  const today = new Date()
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  if (date < todayDate) return "Choose today or a future appointment date."
  const selectedDate = new Date(`${date}T12:00:00`)
  if (Number.isNaN(selectedDate.getTime())) return "Choose a valid appointment date."
  if (selectedDate.getDay() === 0) return "Appointments are unavailable on Sundays."
  if (!appointmentTimeOptions.some((option) => option.value === body.time)) {
    return "Choose a time between 9:00 AM and 5:00 PM."
  }
  return null
}
const requestPath = (role: string, id: number) =>
  role === "customer"
    ? `/customer/repair-status/${id}`
    : `/${role}/work-orders/${id}`

export function MyVehicles() {
  const remote = useOperations(),
    navigate = useNavigate()
  const [remove, setRemove] = useState<Row | null>(null)
  return (
    <Frame
      remote={remote}
      title="My Vehicles"
      action={
        <Button onClick={() => navigate("/customer/vehicles/new")}>
          Add vehicle
        </Button>
      }
    >
      {(d) => (
        <>
          <SearchTable
            headers={["Vehicle", "VIN / plate", "Mileage", "Actions"]}
            rows={d.vehicles.map((v) => [
              label(v),
              <>
                <p>{v.vin || "—"}</p>
                <p>{v.license_plate || "—"}</p>
              </>,
              v.mileage,
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/customer/vehicles/${v.id}`)}
                >
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => setRemove(v)}>
                  Remove
                </Button>
              </div>,
            ])}
            searchText={d.vehicles.map((v) => Object.values(v).join(" "))}
          />
          <Modal
            open={!!remove}
            title="Remove vehicle"
            onClose={() => {
              if (!remote.busy) setRemove(null)
            }}
          >
            <p className="mb-5 text-sm">
              Remove {remove && label(remove)}? Vehicles with service history
              are preserved.
            </p>
            <Button
              disabled={remote.busy}
              onClick={() =>
                void remote.act("vehicle.delete", { id: remove?.id }, () =>
                  setRemove(null),
                )
              }
            >
              Confirm removal
            </Button>
          </Modal>
        </>
      )}
    </Frame>
  )
}
export function VehicleForm() {
  const remote = useOperations(),
    id = identity(useLogicalPath()),
    navigate = useNavigate()
  return (
    <Frame
      remote={remote}
      title={id === "new" ? "Add vehicle" : "Edit vehicle"}
    >
      {(d) => {
        const v = d.vehicles.find((v) => String(v.id) === id)
        if (id !== "new" && !v)
          return <p>Vehicle not found or access denied.</p>
        return (
          <Card className="max-w-2xl p-6">
            <OperationForm
              key={id}
              busy={remote.busy}
              label="Save vehicle"
              submit={(b) =>
                void remote.act("vehicle.save", { ...b, id: v?.id ?? 0 }, () =>
                  navigate("/customer/vehicles"),
                )
              }
              fields={[
                {
                  key: "make",
                  label: "Make",
                  required: true,
                  max: 50,
                  value: v?.make,
                },
                {
                  key: "model",
                  label: "Model",
                  required: true,
                  max: 50,
                  value: v?.model,
                },
                {
                  key: "year",
                  label: "Year",
                  required: true,
                  type: "number",
                  min: 1886,
                  max: new Date().getFullYear() + 1,
                  value: v?.year ?? new Date().getFullYear(),
                },
                { key: "color", label: "Color", max: 50, value: v?.color },
                { key: "vin", label: "VIN (optional)", max: 17, value: v?.vin },
                {
                  key: "plate",
                  label: "License plate",
                  max: 15,
                  value: v?.license_plate,
                },
                {
                  key: "mileage",
                  label: "Mileage",
                  required: true,
                  type: "number",
                  min: 0,
                  value: v?.mileage ?? 0,
                },
              ]}
            />
          </Card>
        )
      }}
    </Frame>
  )
}
export function CustomerRequests() {
  const remote = useOperations(),
    navigate = useNavigate()
  return (
    <Frame
      remote={remote}
      title="Service Requests"
      action={
        <Button onClick={() => navigate("/customer/requests/new")}>
          New service request
        </Button>
      }
    >
      {(d) => {
        const requests = d.requests.filter((request) => request.stage !== "Completed")
        return (
          <div>
            <SearchTable
              headers={["Request", "Vehicle", "Services", "Stage", "Actions"]}
              rows={requests.map((r) => [
                `#${r.id}`,
                r.vehicle,
                r.services,
                <StatusBadge status={r.stage} />,
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/customer/repair-status/${r.id}`)}
                >
                  Open
                </Button>,
              ])}
              searchText={requests.map(
                (r) => `${r.id} ${r.vehicle} ${r.services} ${r.stage}`,
              )}
            />
          </div>
        )
      }}
    </Frame>
  )
}
export function CreateServiceRequest() {
  const remote = useOperations(),
    navigate = useNavigate()
  const [services, setServices] = useState<number[]>([])
  return (
    <Frame remote={remote} title="New Service Request">
      {(d) => (
        <Card className="max-w-2xl p-6">
          <OperationForm
            busy={remote.busy || !services.length}
            label="Submit request"
            submit={(b) =>
              void remote.act(
                "request.create",
                { ...b, serviceIds: services },
                () => navigate("/customer/requests"),
              )
            }
            fields={[
              {
                key: "vehicleId",
                label: "Vehicle",
                required: true,
                options: d.vehicles.map((v) => ({
                  value: v.id,
                  label: label(v),
                })),
              },
              {
                key: "description",
                label: "Concern",
                type: "textarea",
                required: true,
                max: 5000,
              },
              {
                key: "date",
                label: "Preferred appointment date (optional)",
                type: "date",
                min: localDateInput(new Date()),
              },
              {
                key: "time",
                label: "Preferred time (required when selecting a date)",
                options: appointmentTimeOptions,
              },
            ]}
            validate={appointmentSlotError}
          >
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Services (select at least one)
              </legend>
              <div className="grid max-h-60 gap-2 overflow-auto sm:grid-cols-2">
                {d.serviceTypes.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={services.includes(s.id)}
                      onChange={(e) =>
                        setServices(
                          e.target.checked
                            ? [...services, s.id]
                            : services.filter((id) => id !== s.id),
                        )
                      }
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </OperationForm>
        </Card>
      )}
    </Frame>
  )
}
function AppointmentList({
  remote,
  data,
}: {
  remote: ReturnType<typeof useOperations>
  data: OperationsData
}) {
  const [cancel, setCancel] = useState<Row | null>(null)
  return (
    <>
      <Card>
        <CardHeader title="Appointments" />
        <GridTable
          headers={[
            "Appointment",
            "Request",
            "Date / time",
            "Status",
            "Actions",
          ]}
          rows={data.appointments.map((a) => [
            `#${a.id}`,
            `#${a.service_request_id}`,
            `${String(a.scheduled_date).slice(0, 10)} ${String(a.scheduled_time ?? "").slice(0, 5)}`,
            <StatusBadge status={a.status} />,
            !["CANCELLED", "COMPLETED"].includes(a.status_code) ? (
              <Button variant="secondary" onClick={() => setCancel(a)}>
                Cancel
              </Button>
            ) : (
              "—"
            ),
          ])}
        />
      </Card>
      <Modal
        open={!!cancel}
        onClose={() => {
          if (!remote.busy) setCancel(null)
        }}
        title="Cancel appointment"
      >
        <p className="mb-5 text-sm">
          Cancel this appointment? The service request remains available for
          rescheduling.
        </p>
        <Button
          disabled={remote.busy}
          onClick={() =>
            void remote.act(
              "appointment.cancel",
              { requestId: cancel?.service_request_id },
              () => setCancel(null),
            )
          }
        >
          Confirm cancellation
        </Button>
      </Modal>
    </>
  )
}
export const CustomerAppointments = CustomerRequests
export function AdminRequests() {
  return <RequestList admin />
}
export function WorkOrders() {
  return <RequestList />
}
function RequestList({ admin = false }: { admin?: boolean }) {
  const remote = useOperations(),
    { isAdmin } = useApp(),
    navigate = useNavigate()
  const role = isAdmin ? "admin" : "technician"
  const [stage, setStage] = useState("All")
  return (
    <Frame remote={remote} title={admin ? "Service Requests" : "Work Orders"}>
      {(d) => {
        const rows = d.requests
          .filter((r) => {
            const held = Number(r.held) === 1
            return admin
              ? r.stage === "Service Requested"
              : (Boolean(r.work_order_id) || held) &&
                  (held || stage === "All" || r.stage === stage)
          })
          .sort((a, b) => Number(a.held) - Number(b.held))
        return (
          <div className="space-y-5">
            {!admin && (
              <Select
                aria-label="Filter work stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option>All</option>
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
            <SearchTable
              headers={[
                "Request / work order",
                "Vehicle",
                "Customer",
                "Services",
                "Appointment",
                "Stage",
                "Actions",
              ]}
              rows={rows.map((r) => [
                `#${r.id}${r.work_order_id ? ` / #${r.work_order_id}` : ""}`,
                r.vehicle,
                r.customer_name,
                r.services,
                (() => {
                  const appointment = d.appointments.find((item) =>
                    Number(item.service_request_id) === Number(r.id) &&
                    !["CANCELLED", "CANCELED", "COMPLETED"].includes(
                      String(item.status_code ?? item.status ?? "").toUpperCase(),
                    ),
                  )
                  return appointment
                    ? `${String(appointment.scheduled_date).slice(0, 10)} ${String(appointment.scheduled_time ?? "").slice(0, 5)}`
                    : "Not scheduled"
                })(),
                <>
                  <StatusBadge status={r.stage} />
                  {!!Number(r.held) && (
                    <span className="ml-2 text-xs text-amber-700">On hold</span>
                  )}
                </>,
                <Button
                  variant="secondary"
                  onClick={() => navigate(requestPath(role, r.id))}
                >
                  Open
                </Button>,
              ])}
              searchText={rows.map(
                (r) =>
                  `${r.id} ${r.work_order_id} ${r.vehicle} ${r.customer_name} ${r.services} ${r.stage}`,
              )}
            />
          </div>
        )
      }}
    </Frame>
  )
}
export function WorkOrderDetail() {
  const remote = useOperations(),
    path = useLogicalPath(),
    id = identity(path),
    { accountId, isAdmin } = useApp()
  const customer = path.startsWith("/customer/")
  const [confirmation, setConfirmation] = useState<{
    action: string
    body: Record<string, unknown>
    label: string
  } | null>(null)
  const confirm = (
    action: string,
    body: Record<string, unknown>,
    label: string,
  ) => setConfirmation({ action, body, label })
  return (
    <Frame remote={remote} title={customer ? "Service Progress" : "Work Order"}>
      {(d) => {
        const r = d.requests.find((r) => String(r.id) === id)
        if (!r) return <p>Record not found or access denied.</p>
        const owner = accountId === `db:${r.customer_id}`,
          assigned = accountId === `db:${r.technician_id}`,
          held = Number(r.held) === 1,
          activeAppointment = d.appointments.find((appointment) =>
            Number(appointment.service_request_id) === Number(r.id) &&
            !["CANCELLED", "CANCELED", "COMPLETED"].includes(
              String(appointment.status_code ?? appointment.status ?? "").toUpperCase(),
            ),
          ),
          hasActiveAppointment = Boolean(activeAppointment),
          invoice = d.invoices.find((i) => i.work_order_id === r.work_order_id)
        return (
          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="mb-2 font-semibold">
                Request #{r.id}
                {r.work_order_id ? ` · Work order #${r.work_order_id}` : ""}
              </h3>
              <p className="mb-5 text-sm text-ink-500">
                {r.vehicle} · {r.services}
              </p>
              <StageTracker stages={[...STAGES]} current={r.stage} />
            </Card>
            <Card className="p-5">
              <p className="whitespace-pre-wrap text-sm">{r.description}</p>
              {r.diagnosis && (
                <div className="mt-4">
                  <h3 className="font-semibold">Diagnosis</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">
                    {r.diagnosis}
                  </p>
                </div>
              )}
              {held && (
                <p className="mt-4 text-sm text-amber-700">
                  On hold: {r.hold_reason}
                </p>
              )}
            </Card>
            {owner && customer && !held && r.stage === "Service Requested" && (
              <Card className="p-5">
                <h3 className="mb-3 font-semibold">Appointment</h3>
                {activeAppointment ? (
                  <>
                    <p className="mb-4 text-sm text-ink-500">
                      Current appointment: {String(activeAppointment.scheduled_date).slice(0, 10)} at {String(activeAppointment.scheduled_time ?? "").slice(0, 5)}
                    </p>
                    <OperationForm
                      busy={remote.busy}
                      label="Change appointment"
                      submit={(body) =>
                        void remote.act("appointment.save", {
                          ...body,
                          requestId: r.id,
                        })
                      }
                      validate={appointmentSlotError}
                      fields={[
                        {
                          key: "date",
                          label: "New date",
                          type: "date",
                          required: true,
                          min: localDateInput(new Date()),
                          value: String(activeAppointment.scheduled_date).slice(0, 10),
                        },
                        {
                          key: "time",
                          label: "New time",
                          required: true,
                          options: appointmentTimeOptions,
                          value: String(activeAppointment.scheduled_time ?? "").slice(0, 5),
                        },
                      ]}
                    />
                  </>
                ) : (
                  <p className="mb-4 text-sm text-ink-500">
                    An admin will schedule an appointment before check-in.
                  </p>
                )}
              </Card>
            )}
            {isAdmin && !customer && !held && r.stage === "Service Requested" && (
              <Card className="p-5">
                <h3 className="mb-3 font-semibold">Appointment</h3>
                {activeAppointment && (
                  <p className="mb-4 text-sm text-ink-500">
                    Current appointment: {String(activeAppointment.scheduled_date).slice(0, 10)} at {String(activeAppointment.scheduled_time ?? "").slice(0, 5)}
                  </p>
                )}
                <OperationForm
                  busy={remote.busy}
                  label={activeAppointment ? "Change appointment" : "Schedule appointment"}
                  submit={(body) =>
                    void remote.act("appointment.save", {
                      ...body,
                      requestId: r.id,
                    })
                  }
                  validate={appointmentSlotError}
                  fields={[
                    {
                      key: "date",
                      label: "Date",
                      type: "date",
                      required: true,
                      min: localDateInput(new Date()),
                      value: activeAppointment
                        ? String(activeAppointment.scheduled_date).slice(0, 10)
                        : undefined,
                    },
                    {
                      key: "time",
                      label: "Time",
                      required: true,
                      options: appointmentTimeOptions,
                      value: activeAppointment
                        ? String(activeAppointment.scheduled_time ?? "").slice(0, 5)
                        : undefined,
                    },
                  ]}
                />
              </Card>
            )}
            {isAdmin && !customer && r.stage !== "Completed" && !held && (
              <Card className="p-5">
                <OperationForm
                  busy={remote.busy}
                  label={
                    r.technician_id
                      ? "Reassign technician"
                      : "Assign technician"
                  }
                  submit={(b) =>
                    void remote.act("assign", { ...b, requestId: r.id })
                  }
                  fields={[
                    {
                      key: "technicianId",
                      label: "Technician",
                      required: true,
                      value: r.technician_id,
                      options: d.technicians
                        .filter((t) => t.availability !== "Off")
                        .map((t) => ({
                          value: t.id,
                          label: `${t.first_name} ${t.last_name} · ${t.availability}`,
                        })),
                    },
                  ]}
                />
                {r.work_order_id && r.stage === "Service Requested" && (
                  <Button
                    className="mt-4"
                    variant="secondary"
                    onClick={() =>
                      confirm(
                        "unassign",
                        { requestId: r.id },
                        "Unassign this unstarted work order",
                      )
                    }
                  >
                    Unassign technician
                  </Button>
                )}
              </Card>
            )}
            {!held && r.stage === "Service Requested" && isAdmin && (
              <Card className="p-5">
                <RequestEditor row={r} remote={remote} data={d} />
              </Card>
            )}
            {!held &&
              r.stage === "Service Requested" &&
              !customer &&
              (assigned || isAdmin) && (
                <Card className="p-5">
                  {hasActiveAppointment ? (
                    <OperationForm
                      busy={remote.busy}
                      label="Check in vehicle"
                      submit={(b) =>
                        void remote.act("checkin", { ...b, requestId: r.id })
                      }
                      fields={[
                        {
                          key: "note",
                          label: "Check-in notes",
                          type: "textarea",
                          max: 500,
                        },
                      ]}
                    />
                  ) : owner || isAdmin ? (
                    <p className="text-sm text-ink-500">
                      An active appointment must be scheduled by an admin before check-in.
                    </p>
                  ) : (
                    <p className="text-sm text-ink-500">
                      An admin must schedule an active appointment before check-in.
                    </p>
                  )}
                </Card>
              )}
            <Card className="p-5">
              <PartsSummary data={d} order={r.work_order_id} />
            </Card>
            {!held &&
              (assigned || isAdmin) &&
              ["Vehicle Checked In", "Diagnosis"].includes(r.stage) && (
                <Card className="p-5">
                  <DiagnosisEditor
                    key={`${r.id}-${r.stage}`}
                    row={r}
                    remote={remote}
                    data={d}
                  />
                </Card>
              )}
            {!held && r.stage === "Customer Approval" && (owner || isAdmin) && (
              <Card className="p-5">
                <ConsentEditor
                  row={r}
                  remote={remote}
                  admin={isAdmin && !owner}
                  data={d}
                />
              </Card>
            )}
            {!held && r.stage === "Repair" && (assigned || isAdmin) && (
              <Card className="p-5">
                <OperationForm
                  busy={remote.busy}
                  label="Complete repair"
                  submit={(b) =>
                    confirm(
                      "complete",
                      { ...b, requestId: r.id },
                      "Mark these approved repairs completed",
                    )
                  }
                  fields={[
                    {
                      key: "note",
                      label: "Completion notes",
                      type: "textarea",
                      max: 500,
                    },
                  ]}
                />
              </Card>
            )}
            {r.stage !== "Completed" && (assigned || isAdmin) && (
              <Card className="p-5">
                <OperationForm
                  busy={remote.busy}
                  label={held ? "Resume work order" : "Hold work order"}
                  submit={(b) =>
                    void remote.act(held ? "resume" : "hold", {
                      ...b,
                      requestId: r.id,
                    })
                  }
                  fields={[
                    {
                      key: "note",
                      label: held ? "Reason for resuming" : "Reason for hold",
                      required: true,
                      max: 500,
                    },
                  ]}
                />
              </Card>
            )}
            {r.stage === "Completed" && isAdmin && !invoice && (
              <Card className="p-5">
                <PartsSummary data={d} order={r.work_order_id} />
                <p className="my-3 text-sm text-ink-500">
                  Review the approved parts above. Labor is added to the parts
                  total when you issue the invoice.
                </p>
                <OperationForm
                  busy={remote.busy}
                  label="Issue final invoice"
                  submit={(b) =>
                    confirm(
                      "invoice.issue",
                      { ...b, requestId: r.id },
                      "Issue this final invoice",
                    )
                  }
                  fields={[
                    {
                      key: "labor",
                      label: "Labor charges ($)",
                      required: true,
                      type: "number",
                      min: 0,
                      max: 99999999.99,
                      step: "0.01",
                    },
                    {
                      key: "laborDescription",
                      label: "Labor description",
                      value: "Labor charges",
                      required: true,
                      max: 500,
                    },
                  ]}
                />
              </Card>
            )}
            {invoice && (
              <Card className="p-5">
                <h3 className="font-semibold">Invoice #{invoice.id}</h3>
                <p className="mt-2 text-sm">
                  Amount: {money(Number(invoice.amount))} · Collected:{" "}
                  {money(Number(invoice.collected))}
                </p>
                {(customer || isAdmin) && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={() =>
                      downloadInvoice(
                        invoice,
                        d.invoiceDetails?.find(
                          (x) => Number(x.invoice_id) === Number(invoice.id),
                        ),
                        (d.invoiceLines ?? []).filter(
                          (x) => Number(x.invoice_id) === Number(invoice.id),
                        ),
                      )
                    }
                  >
                    Download full invoice
                  </Button>
                )}
                {isAdmin &&
                  Number(invoice.amount) > Number(invoice.collected) && (
                    <Button
                      className="mt-4"
                      onClick={() =>
                        confirm(
                          "payment.record",
                          { requestId: r.id },
                          "Confirm the outstanding balance was received",
                        )
                      }
                    >
                      Record confirmed payment
                    </Button>
                  )}
              </Card>
            )}
            {!customer && (
              <Card className="p-5">
                <Link
                  to={isAdmin ? "/admin/inventory" : "/technician/parts"}
                  className="text-sm font-medium text-brand-600 underline"
                >
                  {isAdmin ? "Inventory and parts requests" : "Browse inventory"}
                </Link>
              </Card>
            )}
            <Card>
              <CardHeader title="Activity history" />
              <GridTable
                headers={["When", "Actor", "Action", "Stage", "Note"]}
                rows={d.events
                  .filter((e) => e.request_id === r.id)
                  .map((e) => [
                    String(e.created_at).replace("T", " "),
                    e.actor,
                    e.action,
                    e.stage,
                    e.note || "—",
                  ])}
              />
            </Card>
            {owner && !held && r.stage === "Service Requested" && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() =>
                    confirm(
                      "request.cancel",
                      { requestId: r.id },
                      "Cancel this unstarted service request",
                    )
                  }
                >
                  Cancel service request
                </Button>
              </div>
            )}
            {isAdmin && !customer && !held && r.stage === "Service Requested" && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() =>
                    confirm(
                      "request.cancel",
                      { requestId: r.id, note: "" },
                      "Cancel this unstarted work order",
                    )
                  }
                >
                  Cancel work order
                </Button>
              </div>
            )}
            <Modal
              open={!!confirmation}
              title="Confirm action"
              onClose={() => {
                if (!remote.busy) setConfirmation(null)
              }}
            >
              <p className="mb-5 text-sm">{confirmation?.label}?</p>
              {confirmation?.action === "request.cancel" && isAdmin && (
                <Field label="Reason for cancellation" required>
                  <Textarea
                    value={String(confirmation.body.note ?? "")}
                    maxLength={500}
                    onChange={(e) =>
                      setConfirmation({
                        ...confirmation,
                        body: { ...confirmation.body, note: e.target.value },
                      })
                    }
                  />
                </Field>
              )}
              {confirmation?.action === "payment.record" && (
                <Field label="Payment method">
                  <Select
                    value={String(confirmation.body.method ?? "OTHER")}
                    onChange={(e) =>
                      setConfirmation({
                        ...confirmation,
                        body: { ...confirmation.body, method: e.target.value },
                      })
                    }
                  >
                    {["BANK_TRANSFER", "CARD", "WALLET", "OTHER"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </Field>
              )}
              {remote.error && (
                <p role="alert" className="mb-4 text-sm text-red-700">
                  {remote.error}
                </p>
              )}
              <Button
                disabled={
                  remote.busy ||
                  (confirmation?.action === "request.cancel" &&
                    isAdmin &&
                    !String(confirmation.body.note ?? "").trim())
                }
                onClick={() =>
                  confirmation &&
                  void remote.act(confirmation.action, confirmation.body, () =>
                    setConfirmation(null),
                  )
                }
              >
                Confirm
              </Button>
            </Modal>
          </div>
        )
      }}
    </Frame>
  )
}
function billingRevision(data: OperationsData, order: unknown) {
  return Number(
    data.billing?.find((b) => Number(b.work_order_id) === Number(order))
      ?.revision ?? 0,
  )
}
function PartLines({ lines }: { lines: Row[] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="p-2">Part / SKU</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Unit price</th>
            <th className="p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.part_id} className="border-b border-line">
              <td className="p-2">
                {l.name}
                <span className="block text-xs text-ink-500">{l.sku}</span>
              </td>
              <td className="p-2">{l.quantity}</td>
              <td className="p-2">{money(Number(l.unit_price))}</td>
              <td className="p-2">
                {money(
                  Number(
                    l.line_total ?? Number(l.quantity) * Number(l.unit_price),
                  ),
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!lines.length && (
        <p className="p-2 text-sm text-ink-500">No parts selected.</p>
      )}
    </div>
  )
}
function PartsSummary({
  data,
  order,
}: {
  data: OperationsData
  order: unknown
}) {
  const lines = (data.workOrderParts ?? []).filter(
    (p) => Number(p.work_order_id) === Number(order),
  )
  const total = lines.reduce(
    (sum, p) => sum + Number(p.quantity) * Number(p.unit_price),
    0,
  )
  return (
    <>
      <h3 className="font-semibold">Parts for this work order</h3>
      <PartLines lines={lines} />
      <p className="font-semibold">Parts total: {money(total)}</p>
    </>
  )
}
function PartsEditor({
  row,
  remote,
  data,
}: {
  row: Row
  remote: ReturnType<typeof useOperations>
  data: OperationsData
}) {
  const [partId, setPartId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const lines = (data.workOrderParts ?? []).filter(
    (p) => Number(p.work_order_id) === Number(row.work_order_id),
  )
  const part = data.parts?.find((p) => String(p.id) === partId)
  const selected = lines.find((p) => String(p.part_id) === partId)
  const save = (id: unknown, qty: unknown) =>
    void remote.act("parts.set", {
      requestId: row.id,
      partId: id,
      quantity: qty,
      revision: billingRevision(data, row.work_order_id),
    })
  return (
    <div className="mb-6 space-y-3">
      <h3 className="font-semibold">Choose parts during diagnosis</h3>
      <p className="text-sm text-ink-500">
        Saving deducts stock immediately. Reduce quantities or remove unused
        parts to return stock. Submitted parts are locked until the customer
        requests a revision.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Part">
          <Select
            value={partId}
            onChange={(e) => {
              const id = e.target.value
              setPartId(id)
              setQuantity(
                String(
                  lines.find((p) => String(p.part_id) === id)?.quantity ?? 1,
                ),
              )
            }}
          >
            <option value="">Choose a part</option>
            {(data.parts ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.stock_quantity} in stock —{" "}
                {p.unit_price == null
                  ? "Price required"
                  : money(Number(p.unit_price))}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Total quantity for this job">
          <Input
            type="number"
            min="1"
            max="1000000"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Button
          disabled={
            remote.busy ||
            !part ||
            part.unit_price == null ||
            !Number.isInteger(Number(quantity)) ||
            Number(quantity) < 1
          }
          onClick={() => save(partId, quantity)}
        >
          {selected ? "Update quantity" : "Add part"}
        </Button>
      </div>
      {selected && (
        <p className="text-sm">
          Saved unit price: {money(Number(selected.unit_price))}
        </p>
      )}
      {lines.map((p) => (
        <div
          key={p.part_id}
          className="flex justify-between gap-3 items-center text-sm"
        >
          <span>
            {p.name} · {p.quantity} used
          </span>
          <Button
            variant="secondary"
            disabled={remote.busy}
            onClick={() => save(p.part_id, 0)}
          >
            Remove unused part
          </Button>
        </div>
      ))}
    </div>
  )
}
function DiagnosisEditor({
  row,
  remote,
  data,
}: {
  row: Row
  remote: ReturnType<typeof useOperations>
  data: OperationsData
}) {
  const revision = billingRevision(data, row.work_order_id)
  const [diagnosis, setDiagnosis] = useState(row.diagnosis ?? "")
  return (
    <>
      <PartsEditor row={row} remote={remote} data={data} />
      <Field label="Diagnosis and recommended work" required>
        <Textarea
          rows={5}
          value={diagnosis}
          maxLength={5000}
          onChange={(e) => setDiagnosis(e.target.value)}
        />
      </Field>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={remote.busy || !diagnosis.trim()}
          onClick={() =>
            void remote.act("diagnosis.save", { requestId: row.id, diagnosis })
          }
        >
          Save diagnosis
        </Button>
        <Button
          disabled={remote.busy || !diagnosis.trim()}
          onClick={() =>
            void remote.act("diagnosis.submit", {
              requestId: row.id,
              diagnosis,
              revision,
            })
          }
        >
          Request customer approval
        </Button>
      </div>
    </>
  )
}
function ConsentEditor({
  row,
  remote,
  admin,
  data,
}: {
  row: Row
  remote: ReturnType<typeof useOperations>
  admin: boolean
  data: OperationsData
}) {
  const [note, setNote] = useState("")
  return (
    <>
      <p className="mb-4 text-sm">
        Approval covers the diagnosis and the parts total shown above. Labor
        charges will appear on the final invoice.
      </p>
      <Field
        label={
          admin
            ? "Document customer consent (method and details required)"
            : "Note (optional)"
        }
      >
        <Textarea
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="mt-4 flex gap-3">
        <Button
          disabled={remote.busy || (admin && !note.trim())}
          onClick={() =>
            void remote.act("approve", {
              requestId: row.id,
              note,
              revision: billingRevision(data, row.work_order_id),
            })
          }
        >
          {admin ? "Record customer approval" : "Approve repairs"}
        </Button>
        <Button
          variant="secondary"
          disabled={remote.busy || (admin && !note.trim())}
          onClick={() => void remote.act("revise", { requestId: row.id, note })}
        >
          Request revision
        </Button>
      </div>
    </>
  )
}
export const CustomerApproval = WorkOrderDetail
export const RepairStatus = WorkOrderDetail
export const CustomerCheckIn = WorkOrderDetail
export function CustomerInvoices() {
  const remote = useOperations(),
    navigate = useNavigate()
  return (
    <Frame
      remote={remote}
      title="Invoices"
      subtitle="Payments are recorded by the service center after receipt."
    >
      {(d) => (
        <SearchTable
          headers={[
            "Invoice / work order",
            "Created",
            "Amount",
            "Collected",
            "Status",
            "Actions",
          ]}
          rows={d.invoices.map((i) => [
            `#${i.id} / #${i.work_order_id}`,
            String(i.created_at).slice(0, 10),
            money(Number(i.amount)),
            money(Number(i.collected)),
            <StatusBadge status={i.status} />,
            <Button
              variant="secondary"
              onClick={() => navigate(`/customer/invoice/${i.id}`)}
            >
              View
            </Button>,
          ])}
          searchText={d.invoices.map(
            (i) => `${i.id} ${i.work_order_id} ${i.status}`,
          )}
        />
      )}
    </Frame>
  )
}
export function InvoiceDetail() {
  const remote = useOperations(),
    id = identity(useLogicalPath())
  return (
    <Frame remote={remote} title="Invoice">
      {(d) => {
        const i = d.invoices.find((i) => String(i.id) === id)
        return i ? (
          <Card className="max-w-2xl space-y-3 p-6">
            <h3 className="font-semibold">Invoice #{i.id}</h3>
            <p>Work order #{i.work_order_id}</p>
            {(() => {
              const detail = d.invoiceDetails?.find(
                (x) => Number(x.invoice_id) === Number(i.id),
              )
              const lines = (d.invoiceLines ?? []).filter(
                (x) => Number(x.invoice_id) === Number(i.id),
              )
              return (
                <>
                  {detail ? (
                    <>
                      <p>
                        {detail.center_name} · {detail.center_address}
                      </p>
                      <p>
                        {detail.customer_name} · {detail.vehicle}
                      </p>
                      <p>Issued: {String(i.created_at).slice(0, 10)}</p>
                      <PartLines lines={lines} />
                      <p>Parts total: {money(Number(detail.parts_total))}</p>
                      <p>
                        {detail.labor_description}:{" "}
                        {money(Number(detail.labor_total))}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-ink-500">
                      This historical invoice has no stored itemized breakdown.
                    </p>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => downloadInvoice(i, detail, lines)}
                  >
                    Download invoice
                  </Button>
                  <p className="text-xs text-ink-500">
                    Downloads a printable HTML invoice. Open it and choose Print
                    to save as PDF.
                  </p>
                </>
              )
            })()}
            <p className="font-semibold">
              Final amount: {money(Number(i.amount))}
            </p>
            <p>Collected: {money(Number(i.collected))}</p>
            <p>
              Balance:{" "}
              {money(Math.max(0, Number(i.amount) - Number(i.collected)))}
            </p>
            <StatusBadge status={i.status} />
            <p className="text-sm text-ink-500">
              Contact the service center to arrange payment. No card details are
              collected here.
            </p>
          </Card>
        ) : (
          <p>Invoice not found or access denied.</p>
        )
      }}
    </Frame>
  )
}
export function ServiceHistory() {
  const remote = useOperations(),
    navigate = useNavigate()
  return (
    <Frame remote={remote} title="Service History">
      {(d) => {
        const rows = d.requests.filter((r) => r.stage === "Completed")
        return (
          <SearchTable
            headers={["Request", "Vehicle", "Services", "Actions"]}
            rows={rows.map((r) => [
              `#${r.id}`,
              r.vehicle,
              r.services,
              <Button
                variant="secondary"
                onClick={() => navigate(`/customer/repair-status/${r.id}`)}
              >
                View
              </Button>,
            ])}
            searchText={rows.map((r) => `${r.id} ${r.vehicle} ${r.services}`)}
          />
        )
      }}
    </Frame>
  )
}
export function TechnicianManagement() {
  const remote = useOperations(),
    [editing, setEditing] = useState<Row | null>(null)
  return (
    <Frame
      remote={remote}
      title="Technicians"
      subtitle="Manage technician specialties and availability."
    >
      {(d) => (
        <>
          <SearchTable
            headers={[
              "Name",
              "Contact",
              "Specialties",
              "Availability",
              "Open jobs",
              "Actions",
            ]}
            rows={d.technicians.map((t) => [
              `${t.first_name} ${t.last_name}`,
              t.email,
              t.specialties || "—",
              t.availability,
              t.active_jobs,
              <Button variant="secondary" onClick={() => setEditing(t)}>
                Edit
              </Button>,
            ])}
            searchText={d.technicians.map((t) => Object.values(t).join(" "))}
          />
          <Modal
            open={!!editing}
            onClose={() => {
              if (!remote.busy) setEditing(null)
            }}
            title="Edit technician"
          >
            {remote.error && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {remote.error}
              </p>
            )}
            {editing && (
              <OperationForm
                key={editing.id}
                busy={remote.busy}
                label="Save technician"
                submit={(b) =>
                  void remote.act(
                    "technician.save",
                    { ...b, id: editing.id },
                    () => setEditing(null),
                  )
                }
                fields={[
                  {
                    key: "specialties",
                    label: "Specialties (comma separated)",
                    value: editing.specialties,
                    max: 500,
                  },
                  {
                    key: "availability",
                    label: "Availability",
                    required: true,
                    value: editing.availability,
                    options: ["Available", "Busy", "Off"].map((s) => ({
                      value: s,
                      label: s,
                    })),
                  },
                ]}
              />
            )}
          </Modal>
        </>
      )}
    </Frame>
  )
}
export function ProfilePage() {
  const { refreshAccount } = useApp(),
    navigate = useNavigate()
  const remote = useOperations(),
    profile = useRemote(() =>
      apiRequest<{ user: Row }>("/user/me").then((r) => r.user),
    )
  return (
    <Frame remote={remote} title="Profile">
      {() =>
        profile.data ? (
          <Card className="max-w-2xl p-6">
            <p className="mb-5 text-sm text-ink-500">
              {profile.data.email} · {(profile.data.roles ?? []).join(", ")}
            </p>
            <OperationForm
              busy={remote.busy}
              label="Save profile"
              submit={(b) =>
                void remote.act("profile.save", b, async () => {
                  const account = await refreshAccount()
                  navigate(`/${slugify(account.name)}/profile`, {
                    replace: true,
                  })
                })
              }
              fields={[
                {
                  key: "first_name",
                  label: "First name",
                  required: true,
                  max: 50,
                  value: profile.data.first_name,
                },
                {
                  key: "last_name",
                  label: "Last name",
                  required: true,
                  max: 50,
                  value: profile.data.last_name,
                },
                {
                  key: "phone",
                  label: "Phone",
                  type: "tel",
                  max: 20,
                  value: profile.data.phone,
                },
              ]}
            />
          </Card>
        ) : (
          <DataState {...profile} retry={profile.refresh} />
        )
      }
    </Frame>
  )
}

function RequestEditor({
  row,
  remote,
  data,
}: {
  row: Row
  remote: ReturnType<typeof useOperations>
  data: OperationsData
}) {
  const [services, setServices] = useState<number[]>(
    String(row.service_ids ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number),
  )
  return (
    <>
      <h3 className="mb-4 font-semibold">Edit unstarted service request</h3>
      <OperationForm
        busy={remote.busy || !services.length}
        label="Save service request"
        submit={(b) =>
          void remote.act("request.update", {
            ...b,
            requestId: row.id,
            serviceIds: services,
          })
        }
        fields={[
          {
            key: "description",
            label: "Concern",
            required: true,
            type: "textarea",
            value: row.description,
            max: 5000,
          },
        ]}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Services</legend>
          <div className="grid max-h-48 gap-2 overflow-auto sm:grid-cols-2">
            {data.serviceTypes.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={services.includes(s.id)}
                  onChange={(e) =>
                    setServices(
                      e.target.checked
                        ? [...services, s.id]
                        : services.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      </OperationForm>
    </>
  )
}
