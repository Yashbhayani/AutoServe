/** Quote CSV fields and prevent spreadsheet formula evaluation of user-controlled text. */
export function csvDocument(rows: unknown[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = value == null ? "" : String(value)
            if (typeof value === "string" && /^[\s]*[=+@\-\t\r]/.test(text))
              text = "'" + text
            return `"${text.replace(/"/g, '""')}"`
          })
          .join(","),
      )
      .join("\r\n")
  )
}
/** Include empty days without shifting date-only values into another timezone. */
export function dailySeries(
  from: string,
  to: string,
  rows: { day: string; value: number }[],
) {
  const values = new Map(rows.map((r) => [r.day.slice(0, 10), Number(r.value)]))
  const result: { month: string; value: number }[] = []
  const end = Date.parse(to + "T00:00:00Z")
  for (
    let time = Date.parse(from + "T00:00:00Z");
    time <= end && result.length < 367;
    time += 86400000
  ) {
    const day = new Date(time).toISOString().slice(0, 10)
    result.push({ month: day, value: values.get(day) ?? 0 })
  }
  return result
}
