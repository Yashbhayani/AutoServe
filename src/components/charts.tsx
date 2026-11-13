import { useEffect, useId, useRef, useState } from "react"

const compact = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
function useWidth() {
  const ref = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(460)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () =>
      setWidth(Math.max(180, el.getBoundingClientRect().width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}
function ChartData({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <details className="mt-3 text-xs text-ink-500">
      <summary className="cursor-pointer rounded py-1 focus-visible:outline-2 focus-visible:outline-brand-500">
        View chart data
      </summary>
      <div className="mt-2 max-h-48 overflow-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="py-1">Label</th>
              <th className="py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="break-words py-1 pr-3">{r.label}</td>
                <td className="py-1 text-right tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
export function BarChart({
  data,
  height = 200,
  color = "#2563eb",
  onSelect,
  format = (v: number) => v.toLocaleString(),
}: {
  data: { label: string; value: number }[]
  height?: number
  color?: string
  onSelect?: (index: number) => void
  format?: (v: number) => string
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="w-full min-w-0 text-xs">
      <div
        className="space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: Math.max(height, 120) }}
      >
        {!data.length && (
          <p className="py-8 text-center text-ink-400">
            No data in this period.
          </p>
        )}
        {data.map((d, i) => (
          <button
            type="button"
            key={d.label + i}
            aria-pressed={active === i}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => {
              setActive(i)
              onSelect?.(i)
            }}
            className={`block w-full min-w-0 rounded p-1 text-left focus-visible:outline-2 focus-visible:outline-brand-500 ${
              active === i ? "bg-slate-50" : ""
            }`}
          >
            <span className="mb-1 flex min-w-0 justify-between gap-3">
              <span className="min-w-0 break-words text-ink-600">
                {d.label}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-ink-900">
                {format(d.value)}
              </span>
            </span>
            <span className="block h-3 overflow-hidden rounded bg-slate-100">
              <span
                className="block h-full rounded transition-all"
                style={{
                  width: `${(Math.max(0, d.value) / max) * 100}%`,
                  background: color,
                  opacity: active === i ? 1 : 0.75,
                }}
              />
            </span>
          </button>
        ))}
      </div>
      <ChartData
        rows={data.map((d) => ({ label: d.label, value: format(d.value) }))}
      />
    </div>
  )
}
export function LineChart({
  data,
  height = 220,
  color = "#2563eb",
  format = (v: number) => v.toLocaleString(),
  onSelect,
}: {
  data: { month: string; value: number }[]
  height?: number
  color?: string
  format?: (v: number) => string
  onSelect?: (index: number) => void
}) {
  const { ref, width } = useWidth(),
    id = useId(),
    [active, setActive] = useState<number | null>(null)
  const left = 48,
    right = 18,
    top = 18,
    bottom = 32,
    h = Math.max(180, height),
    plotH = h - top - bottom,
    plotW = width - left - right
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.05
  const px = (i: number) =>
    left +
    (data.length === 1 ? plotW / 2 : (i * plotW) / Math.max(1, data.length - 1))
  const py = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH
  const points = data.map((d, i) => `${px(i)},${py(d.value)}`).join(" ")
  const selected = active !== null && active < data.length ? active : null
  const count = width < 280 ? 2 : width < 420 ? 3 : 4
  const ticks = [
    ...new Set(
      Array.from({ length: count }, (_, i) =>
        Math.round((i * (data.length - 1)) / (count - 1)),
      ),
    ),
  ].filter((i) => i >= 0 && i < data.length)
  function choose(i: number) {
    if (data.length) {
      setActive(Math.max(0, Math.min(data.length - 1, i)))
    }
  }
  return (
    <div ref={ref} className="w-full min-w-0 text-xs">
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${width} ${h}`}
        className="block max-w-full rounded focus-visible:outline-2 focus-visible:outline-brand-500"
        role="group"
        aria-label="Interactive trend chart. Use left and right arrows to inspect values."
        tabIndex={data.length ? 0 : undefined}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault()
            choose(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? data.length - 1
                  : (selected ?? 0) + (e.key === "ArrowLeft" ? -1 : 1),
            )
          }
          if (e.key === "Enter" && selected !== null) onSelect?.(selected)
        }}
        onPointerMove={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect()
          choose(
            Math.round(
              ((((e.clientX - bounds.left) * width) / bounds.width - left) /
                plotW) *
                Math.max(1, data.length - 1),
            ),
          )
        }}
        onClick={() => {
          if (selected !== null) onSelect?.(selected)
        }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={left}
              x2={width - right}
              y1={top + plotH * (1 - t)}
              y2={top + plotH * (1 - t)}
              stroke="#e2e8f0"
            />
            <text
              x={left - 8}
              y={top + plotH * (1 - t) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#64748b"
            >
              {compact(max * t)}
            </text>
          </g>
        ))}
        {data.length > 0 && (
          <>
            <polygon
              points={`${px(0)},${top + plotH} ${points} ${px(data.length - 1)},${top + plotH}`}
              fill={`url(#${id})`}
            />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {data.length === 1 && (
              <circle cx={px(0)} cy={py(data[0].value)} r={4} fill={color} />
            )}
          </>
        )}
        {ticks.map((i) => (
          <text
            key={i}
            x={px(i)}
            y={h - 9}
            textAnchor={
              i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"
            }
            fontSize={11}
            fill="#64748b"
          >
            {/^\d{4}-\d{2}-\d{2}$/.test(data[i].month)
              ? data[i].month.slice(5)
              : data[i].month.slice(0, 12)}
          </text>
        ))}
        {selected !== null && (
          <>
            <line
              x1={px(selected)}
              x2={px(selected)}
              y1={top}
              y2={top + plotH}
              stroke={color}
              strokeDasharray="4 3"
              opacity={0.5}
            />
            <circle
              cx={px(selected)}
              cy={py(data[selected].value)}
              r={5}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      <p
        aria-live="polite"
        className="mt-1 min-h-6 break-words rounded bg-slate-50 px-3 py-2 text-ink-600"
      >
        {selected !== null ? (
          <>
            <span>{data[selected].month}</span>
            <strong className="ml-3 font-semibold text-ink-900">
              {format(data[selected].value)}
            </strong>
          </>
        ) : data.length ? (
          "Hover, tap, or use arrow keys to inspect values."
        ) : (
          "No data in this period."
        )}
      </p>
      <ChartData
        rows={data.map((d) => ({ label: d.month, value: format(d.value) }))}
      />
    </div>
  )
}
export function DonutChart({
  segments,
  size = 160,
  onSelect,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  onSelect?: (label: string) => void
}) {
  const [active, setActive] = useState<string | null>(null)
  const total = segments.reduce((n, s) => n + s.value, 0),
    c = size / 2,
    r = c - 16,
    circ = 2 * Math.PI * r
  let offset = 0
  const chosen = segments.find((s) => s.label === active)
  return (
    <div className="w-full min-w-0 text-xs">
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-5">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="max-w-full shrink-0"
          role="img"
          aria-label={`Total: ${total}. Select a status from the legend to inspect it.`}
        >
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={18}
          />
          {segments.map((s) => {
            const len = (s.value / (total || 1)) * circ
            const start = offset
            offset += len
            return (
              <circle
                key={s.label}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.label ? 22 : 18}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-start}
                transform={`rotate(-90 ${c} ${c})`}
                opacity={active && active !== s.label ? 0.35 : 1}
                onPointerEnter={() => setActive(s.label)}
                onClick={() => {
                  setActive(s.label)
                  onSelect?.(s.label)
                }}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            )
          })}
          <text
            x={c}
            y={c}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fill="#0f172a"
          >
            {compact(chosen?.value ?? total)}
          </text>
          <text
            x={c}
            y={c + 19}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
          >
            {chosen
              ? `${total ? ((chosen.value / total) * 100).toFixed(1) : 0}%`
              : "Total"}
          </text>
        </svg>
        <div className="min-w-0 flex-1 basis-44 space-y-1">
          {segments.map((s) => (
            <button
              type="button"
              key={s.label}
              aria-pressed={active === s.label}
              onFocus={() => setActive(s.label)}
              onMouseEnter={() => setActive(s.label)}
              onClick={() => {
                setActive(s.label)
                onSelect?.(s.label)
              }}
              className={`flex w-full min-w-0 items-start gap-2 rounded px-2 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-brand-500 ${
                active === s.label ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <span
                className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="min-w-0 flex-1 break-words text-ink-600">
                {s.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                {s.value.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 break-words text-ink-500">
        {chosen
          ? `${chosen.label}: ${chosen.value.toLocaleString()} (${
              total ? ((chosen.value / total) * 100).toFixed(1) : 0
            }%)`
          : "Select a status to inspect its count and share."}
      </p>
      {active && (
        <button
          type="button"
          onClick={() => setActive(null)}
          className="mt-1 text-brand-600 underline"
        >
          Clear selection
        </button>
      )}
    </div>
  )
}
