import { apiRequest } from "./request"
export type PartRow = {
  id: number
  is_active: boolean | number
  category_id: number
  code: string
  name: string
  sku: string
  category_name: string
  unit_price: number
  stock_quantity: number
  reorder_level: number
}
export type CategoryRow = { id: number; code: string; name: string }
export type PartRequestRow = {
  id: number
  work_order_id: number
  part_id: number
  technician_id: number
  quantity: number
  status: "Pending" | "Issued" | "Rejected"
  note: string
  created_at: string
  resolved_at: string | null
  part_name: string
  sku: string
  technician_name: string
}
export type NoteRow = {
  id: number
  message: string
  type: string
  is_read: boolean | number
  created_at: string
}
export type NotesResponse = {
  items: NoteRow[]
  total: number
  unreadCount: number
  page: number
  size: number
}
export type PriceRow = {
  id: number
  unit_price: number
  effective_from: string
  effective_to: string | null
}
export type DashboardData = {
  summary: Record<string, number>
  from: string
  to: string
  statuses: { label: string; value: number }[]
  activity: { day: string; value: number }[]
  requests: {
    id: number
    description: string
    created_at: string
    status: string
    work_order_id: number | null
    vehicle: string
  }[]
  appointments: {
    id: number
    service_request_id: number
    scheduled_date: string
    scheduled_time: string
    status: string
  }[]
}
export type ReportData = {
  summary: Record<string, number>
  from: string
  to: string
  revenue: { day: string; value: number }[]
  services: { label: string; value: number }[]
  technicians: { id: number; name: string; completed: number; hours: number }[]
  invoices: {
    id: number
    work_order_id: number
    amount: number
    status: string
    created_at: string
    collected: number
  }[]
}
export const shop = {
  parts: () => apiRequest<{ data: PartRow[] }>("/parts").then((r) => r.data),
  archivedParts: () => apiRequest<{data: PartRow[]}>("/parts/archived").then(r => r.data),
  restorePart: (id: number) => apiRequest(`/parts/${id}/restore`, {method: "PUT"}),
  categories: () =>
    apiRequest<{ data: CategoryRow[] }>("/parts/categories").then(
      (r) => r.data,
    ),
  requests: () =>
    apiRequest<{ data: PartRequestRow[] }>("/inventory/requests").then(
      (r) => r.data,
    ),
  prices: (id: number) =>
    apiRequest<{ data: PriceRow[] }>(`/parts/${id}/prices`).then((r) => r.data),
  savePart: (id: number | undefined, body: unknown) =>
    apiRequest(id ? `/parts/update/${id}` : "/parts/create", {
      method: id ? "PUT" : "POST",
      body,
    }),
  archivePart: (id: number) =>
    apiRequest(`/parts/delete/${id}`, { method: "DELETE" }),
  resolvePart: (id: number, status: string) =>
    apiRequest(`/inventory/requests/${id}`, {
      method: "PUT",
      body: { status },
    }),
  notes: (filter = "all", page = 1, size = 20) =>
    apiRequest<NotesResponse>("/notifications", {
      params: { filter, page, size },
    }),
  read: (id?: number) =>
    apiRequest(
      id === undefined
        ? "/notifications/read-all"
        : `/notifications/${id}/read`,
      { method: "PUT" },
    ),
  dashboard: (role: string, from: string, to: string) =>
    apiRequest<DashboardData>("/dashboard", { params: { role, from, to } }),
  report: (from: string, to: string) =>
    apiRequest<ReportData>("/reports", { params: { from, to } }),
}
