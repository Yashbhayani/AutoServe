import { useState, type FormEvent } from "react"
import { apiRequest } from "../api/request"
import { useRemote } from "../hooks/useRemote"
import { useApp } from "../store/AppContext"
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Modal,
  PageHeader,
  StatusBadge,
} from "../components/ui"
import { DataState, GridTable, Pager } from "./live"

type UserRow = {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  roles: string[]
  is_active: boolean | number
  created_at: string
}
const roles = ["ADMIN", "TECHNICIAN", "CUSTOMER"]
export function UserManagement() {
  const remote = useRemote(() =>
    apiRequest<{ data: UserRow[] }>("/admin/users").then((r) => r.data),
  )
  const { accountId } = useApp()
  const [search, setSearch] = useState(""),
    [role, setRole] = useState("all"),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Partial<UserRow> | null>(null),
    [selected, setSelected] = useState("CUSTOMER"),
    [confirm, setConfirm] = useState<UserRow | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("")
  const rows = (remote.data ?? []).filter(
    (u) =>
      (role === "all" || u.roles.includes(role)) &&
      (status === "all" || Boolean(u.is_active) === (status === "active")) &&
      `${u.first_name} ${u.last_name} ${u.email} ${u.phone ?? ""} ${u.roles.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)))
  const self = (u: Partial<UserRow>) => accountId === `db:${u.id}`
  function open(u: Partial<UserRow>) {
    setError("")
    setEditing(u)
    setSelected(u.roles?.length === 1 ? u.roles[0] : u.id ? "" : "CUSTOMER")
  }
  async function save(id: number | undefined, body: unknown) {
    if (busy) return
    setBusy(true)
    setError("")
    setSuccess("")
    try {
      await apiRequest(id ? `/admin/users/${id}` : "/admin/users", {
        method: id ? "PUT" : "POST",
        body,
      })
      setEditing(null)
      setConfirm(null)
      setSuccess("User saved.")
      if (id && accountId === `db:${id}`) {
        window.location.reload()
        return
      }
      remote.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save user.")
    } finally {
      setBusy(false)
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    if (!selected.length) {
      setError("Select one role.")
      return
    }
    void save(editing?.id, {
      firstName: f.get("firstName"),
      lastName: f.get("lastName"),
      email: f.get("email"),
      phone: f.get("phone"),
      password: f.get("password"),
      roles: [selected],
      active: f.get("active") === "true",
    })
  }
  function changeStatus(u: UserRow) {
    void save(u.id, {
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      roles: u.roles,
      active: !u.is_active,
      password: "",
    })
  }
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage customer and staff accounts with one role per user."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={remote.refresh}>
              Refresh
            </Button>
            <Button onClick={() => open({})}>Add user</Button>
          </div>
        }
      />
      {!editing && !confirm && error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 text-sm text-green-700">
          {success}
        </p>
      )}
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          aria-label="Search users"
          className="max-w-xs"
          placeholder="Search name, email or phone"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <Select
          aria-label="Filter role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <DataState {...remote} retry={remote.refresh} />
      {remote.data && (
        <Card>
          <GridTable
            headers={["Name", "Contact", "Roles", "Status", "Actions"]}
            rows={rows.slice((current - 1) * 10, current * 10).map((u) => [
              `${u.first_name} ${u.last_name}${self(u) ? " (you)" : ""}`,
              <>
                <p className="break-all">{u.email}</p>
                <p className="text-xs text-ink-400">{u.phone || "No phone"}</p>
              </>,
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded bg-slate-100 px-2 py-1 text-xs"
                  >
                    {r}
                  </span>
                ))}
              </div>,
              <StatusBadge status={u.is_active ? "Active" : "Inactive"} />,
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => open(u)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || self(u)}
                  onClick={() => {
                    setError("")
                    if (u.roles.length !== 1) {open(u);setError("Select a single role before changing account status.");} else setConfirm(u)
                  }}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>,
            ])}
          />
          <Pager page={current} total={rows.length} onChange={setPage} />
        </Card>
      )}
      <Modal
        open={editing !== null}
        onClose={() => {
          if (!busy) setEditing(null)
        }}
        title={editing?.id ? "Edit user" : "Add user"}
      >
        {editing && (
          <form
            key={editing.id ?? "new"}
            onSubmit={submit}
            className="space-y-4"
          >
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name">
                <Input
                  name="firstName"
                  required
                  maxLength={50}
                  defaultValue={editing.first_name}
                />
              </Field>
              <Field label="Last name">
                <Input
                  name="lastName"
                  required
                  maxLength={50}
                  defaultValue={editing.last_name}
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                type="email"
                name="email"
                required
                maxLength={120}
                defaultValue={editing.email}
              />
            </Field>
            <Field label="Phone (optional)">
              <Input
                type="tel"
                name="phone"
                maxLength={20}
                defaultValue={editing.phone ?? ""}
              />
            </Field>
            <Field
              label={
                editing.id
                  ? "New password (leave blank to keep current)"
                  : "Password"
              }
            >
              <Input
                name="password"
                type="password"
                required={!editing.id}
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <fieldset disabled={self(editing)} className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Role</legend>
              {roles.map((r) => (
                <label
                  key={r}
                  className="mr-4 inline-flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="user-role"
                    required
                    value={r}
                    checked={selected === r}
                    onChange={() => setSelected(r)}
                  />
                  {r}
                </label>
              ))}
            </fieldset>
            <Field label="Account status">
              <Select
                name="active"
                defaultValue={
                  editing.is_active === undefined || editing.is_active
                    ? "true"
                    : "false"
                }
              >
                <option value="true">Active</option>
                <option value="false" disabled={self(editing)}>
                  Inactive
                </option>
              </Select>
            </Field>
            {self(editing) && (
              <p className="text-xs text-ink-500">
                Another administrator must change your roles or deactivate your
                account. Changing your email requires signing in again.
              </p>
            )}
            <Button type="submit" disabled={busy || !selected}>
              {busy ? "Saving…" : "Save user"}
            </Button>
          </form>
        )}
      </Modal>
      <Modal
        open={confirm !== null}
        onClose={() => {
          if (!busy) setConfirm(null)
        }}
        title={confirm?.is_active ? "Deactivate user" : "Activate user"}
      >
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="mb-5 text-sm">
          {confirm?.is_active
            ? "This user will lose account access. Their service history will be preserved."
            : "This user will be able to sign in again."}
        </p>
        <Button
          disabled={busy}
          onClick={() => confirm && changeStatus(confirm)}
        >
          {busy ? "Saving…" : "Confirm"}
        </Button>
      </Modal>
    </>
  )
}
