import type { RepairStage } from "../types.ts"
import { STAGES } from "./constants.ts"

/** Forward transitions follow the six-stage workflow; a declined approval returns to diagnosis. */
export function canAdvance(from: RepairStage, to: RepairStage): boolean {
  const index = STAGES.indexOf(from)
  return (
    index >= 0 &&
    (STAGES[index + 1] === to ||
      (from === "Customer Approval" && to === "Diagnosis"))
  )
}
export function diagnosisUpdate(
  stage: RepairStage,
  text: string,
  submit: boolean,
) {
  if (stage !== "Vehicle Checked In" && stage !== "Diagnosis")
    throw new Error("Diagnosis cannot be changed at this stage.")
  if (!text.trim())
    throw new Error("Enter a diagnosis before saving or requesting approval.")
  const stages: RepairStage[] = ["Diagnosis"]
  if (submit) stages.push("Customer Approval")
  return { diagnosis: text.trim(), stages }
}
