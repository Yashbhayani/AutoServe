import type { Row } from "../api/operations.ts"

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  )
const dollars = (value: unknown) => `$${Number(value ?? 0).toFixed(2)}`

/** Standalone, printable invoice; all data is escaped and requires no network access. */
export function invoiceDocument(
  invoice: Row,
  details: Row | undefined,
  lines: Row[],
) {
  const itemRows = lines
    .map(
      (l) =>
        `<tr><td>${escape(l.name)}<small>${escape(l.sku)}</small></td><td>${escape(l.quantity)}</td><td>${dollars(l.unit_price)}</td><td>${dollars(l.line_total)}</td></tr>`,
    )
    .join("")
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Invoice ${escape(invoice.id)}</title><style>body{font:16px system-ui,sans-serif;max-width:850px;margin:40px auto;padding:20px;color:#172033}h1{margin-bottom:8px}small{display:block;color:#596579}table{border-collapse:collapse;width:100%;margin:24px 0}td,th{padding:12px;border-bottom:1px solid #d9deea;text-align:right}td:first-child,th:first-child{text-align:left}.totals{text-align:right}p{white-space:pre-wrap}@media print{body{margin:0}button{display:none}}</style><h1>${escape(details?.center_name || "AutoServe")}</h1><p>${escape(details?.center_address)}\n${escape(details?.center_phone)} ${escape(details?.center_email)}</p><h2>Invoice #${escape(invoice.id)}</h2><p>Issued: ${escape(invoice.created_at)}\nWork order #${escape(invoice.work_order_id)}\nCustomer: ${escape(details?.customer_name || "See service record")}\nVehicle: ${escape(details?.vehicle || "See service record")}</p>${
    details
      ? `<table><thead><tr><th>Part / SKU</th><th>Quantity</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${itemRows || '<tr><td colspan="4">No parts charged</td></tr>'}</tbody></table><div class="totals"><p>Parts: ${dollars(details.parts_total)}</p><p>${escape(details.labor_description)}: ${dollars(details.labor_total)}</p></div>`
      : "<p>This historical invoice has no stored itemized breakdown.</p>"
  }<div class="totals"><h2>Total: ${dollars(invoice.amount)}</h2><p>Collected: ${dollars(invoice.collected)}</p><p>Balance: ${dollars(Math.max(0, Number(invoice.amount) - Number(invoice.collected)))}</p><p>Status: ${escape(invoice.status)}</p></div><p>Payment is confirmed by the service center. Keep this invoice for your records.</p></html>`
}
export function downloadInvoice(
  invoice: Row,
  details: Row | undefined,
  lines: Row[],
) {
  const url = URL.createObjectURL(
    new Blob([invoiceDocument(invoice, details, lines)], {
      type: "text/html;charset=utf-8",
    }),
  )
  const a = document.createElement("a")
  a.href = url
  a.download = `AutoServe-invoice-${invoice.id}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
