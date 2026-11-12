import type { Invoice, Part, RepairLine, ServiceRequest } from "../types";

export function lineCost(line: RepairLine, parts: Part[], laborRate: number) {
  if (line.partId) return (parts.find((part) => part.id === line.partId)?.price ?? 0) * (line.qty ?? 1);
  if (line.type === "Labor" && line.hours !== undefined) return line.hours * laborRate;
  return line.cost; // Older fixtures contain fixed-price lines.
}

export function sumLines(lines: RepairLine[]) {
  return lines.reduce((total, line) => total + line.cost, 0);
}

export function validLines(lines: RepairLine[], parts: Part[], laborRate: number) {
  if (new Set(lines.map((line) => line.id)).size !== lines.length) return false;
  return lines.every((line) => {
    if (!line.id || !line.item.trim()) return false;
    if (line.partId) {
      if (line.type !== "Part" || line.hours !== undefined || !parts.some((part) => part.id === line.partId)) return false;
      if (!Number.isInteger(line.qty ?? 1) || (line.qty ?? 1) < 1) return false;
    } else if (line.hours !== undefined) {
      if (line.type !== "Labor" || !Number.isFinite(line.hours) || line.hours <= 0 || line.hours > 40) return false;
    }
    const cost = lineCost(line, parts, laborRate);
    return Number.isFinite(cost) && cost >= 0;
  });
}

export function estimateError(diagnosis: string, lines: RepairLine[], parts: Part[], laborRate: number, submitting = false) {
  if (!diagnosis.trim()) return "Enter a diagnosis.";
  if (submitting && !lines.length) return "Add at least one estimate line.";
  if (!validLines(lines, parts, laborRate)) return "Check estimate items, part quantities, and labor hours (up to 40 per line).";
  return "";
}

export function invoiceLines(request: ServiceRequest) {
  return request.repairs.filter((line) => line.approved !== false);
}

export function invoiceAmounts(invoice: Invoice, request: ServiceRequest) {
  const subtotal = Math.round(sumLines(invoiceLines(request)) * 100) / 100;
  const tax = Math.round(subtotal * invoice.taxRate * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}
