// Shared work-order workflow UI: estimate breakdown and attributed activity history.
import { useState } from "react";
import { useApp } from "../store/AppContext";
import type { RepairLine, ServiceRequest, ServiceAssignment } from "../data/mock";
import { Button, Card, CardHeader, Field, Modal, Textarea, Table, Td, Thead, Timeline, Tr, money } from "./ui";

export function AssignmentHold({
  assignment,
}: {
  assignment?: ServiceAssignment
}) {
  const { isAdmin, myTechId, holdAssignment, resumeAssignment } = useApp()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  if (!assignment || assignment.status === "Completed") return null
  const held = assignment.status === "On Hold"
  const allowed = isAdmin || myTechId === assignment.technicianId
  return (
    <Card className="mb-5">
      <CardHeader
        title={
          held
            ? `On hold: ${assignment.holdReason ?? "Awaiting resumption"}`
            : "Assignment controls"
        }
        action={
          allowed ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setReason("")
                setError("")
                setOpen(true)
              }}
            >
              {held ? "Resume Assignment" : "Hold Assignment"}
            </Button>
          ) : undefined
        }
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={held ? "Resume Assignment" : "Hold Assignment"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const result = (held ? resumeAssignment : holdAssignment)(
                  assignment.id,
                  reason,
                )
                if (!result.ok)
                  return setError(
                    result.error ?? "Unable to update assignment.",
                  )
                setOpen(false)
              }}
            >
              {held ? "Resume" : "Hold"}
            </Button>
          </>
        }
      >
        <Field label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError("")
            }}
            aria-invalid={!!error}
          />
        </Field>
        {error && (
          <div role="alert" className="mt-3 text-sm text-bad-700">
            {error}
          </div>
        )}
      </Modal>
    </Card>
  )
}

/** Read-only estimate breakdown; prices come from shared inventory and the labor rate. */
export function EstimateTable({
  lines,
  selectable,
  selected = [],
  onToggle,
}: {
  lines: RepairLine[];
  selectable?: boolean;
  selected?: string[];
  onToggle?: (id: string) => void;
}) {
  const { parts, laborRate } = useApp();
  if (!lines.length) return <p className="px-1 py-3 text-sm text-ink-400">No estimate lines yet.</p>;
  const partsTotal = lines.filter((l) => l.type === "Part").reduce((a, b) => a + b.cost, 0);
  const laborTotal = lines.filter((l) => l.type === "Labor").reduce((a, b) => a + b.cost, 0);
  const shown = selectable ? lines.filter((l) => selected.includes(l.id)) : lines;
  return (
    <>
      <Table>
        <Thead cols={[...(selectable ? [""] : []), "Item", "Type", "Qty / Hours", "Unit", "Amount"]} />
        <tbody>
          {lines.map((l) => {
            const part = parts.find((p) => p.id === l.partId);
            const qty = l.partId ? `${l.qty ?? 1}` : l.hours != null ? `${l.hours} h` : "—";
            const unit = part ? money(part.price) : l.hours != null ? `${money(laborRate)}/h` : "Fixed";
            return (
              <Tr key={l.id}>
                {selectable && (
                  <Td className="w-10">
                    <input type="checkbox" checked={selected.includes(l.id)} onChange={() => onToggle?.(l.id)} className="h-4 w-4 rounded border-line accent-brand-500" aria-label={`Select ${l.item}`} />
                  </Td>
                )}
                <Td className="font-medium text-ink-900">
                  {l.item}
                  {l.approved === false && <span className="ml-2 text-[11px] font-medium text-ink-400">(declined)</span>}
                </Td>
                <Td>{l.type}</Td>
                <Td className="tabular">{qty}</Td>
                <Td className="tabular text-ink-500">{unit}</Td>
                <Td className="font-medium text-ink-900 tabular">{money(l.cost)}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <dl className="ml-auto mt-3 w-full max-w-xs space-y-1.5 px-1 text-sm">
        <div className="flex justify-between"><dt className="text-ink-500">Parts</dt><dd className="tabular text-ink-900">{money(partsTotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-500">Labor</dt><dd className="tabular text-ink-900">{money(laborTotal)}</dd></div>
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold text-ink-900">
          <dt>{selectable ? "Selected Total" : "Estimate Total"}</dt>
          <dd className="tabular">{money(shown.reduce((a, b) => a + b.cost, 0))}</dd>
        </div>
      </dl>
    </>
  );
}

/** Who did what, when, with notes and the resulting work-progress stage. Newest first. */
export function ActivityHistory({ req }: { req: ServiceRequest }) {
  return <Timeline items={[...req.timeline].reverse()} />;
}

/** Latest note left with a revision request / rejection, if the estimate was sent back. */
export function revisionNote(req: ServiceRequest) {
  if (req.stage !== "Diagnosed") return null;
  const last = [...req.timeline].reverse().find((t) => t.stage === "Diagnosed" || /revision|rejected/i.test(t.label));
  return last && /revision|rejected/i.test(last.label) ? last : null;
}
