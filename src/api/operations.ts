import { apiRequest } from "./request.ts"
export type Row = Record<string, any>
export type OperationsData = {
  vehicles: Row[]
  requests: Row[]
  appointments: Row[]
  serviceTypes: Row[]
  technicians: Row[]
  invoices: Row[]
  events: Row[]
  settings: Row[]
}
export const operations = {
  load: () => apiRequest<OperationsData>("/operations/snapshot"),
  act: (action: string, body: Record<string, unknown>) =>
    apiRequest<{ id: number; requestId: number }>(`/operations/${action}`, {
      method: "POST",
      body,
    }),
}
