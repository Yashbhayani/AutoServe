export function BarChart({
  data,
  height = 200,
  color = "#2563eb",
  onSelect,
  format = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  /** Makes bars clickable (drill-down). */
  onSelect?: (index: number) => void;
  format?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 14;
  const barW = 34;
  const width = data.length * (barW + gap);
  const chartH = height - 28;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={0}
          x2={width}
          y1={chartH - chartH * t}
          y2={chartH - chartH * t}
          stroke="#eef1f6"
          strokeWidth={1}
        />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = i * (barW + gap) + gap / 2;
        return (
          <g
            key={d.label + i}
            onClick={onSelect ? () => onSelect(i) : undefined}
            className={onSelect ? "cursor-pointer [&:hover>rect]:opacity-100" : undefined}
          >
            <title>{`${d.label}: ${format(d.value)}`}</title>
            {onSelect && <rect x={x - gap / 2} y={0} width={barW + gap} height={height} fill="transparent" />}
            <rect
              x={x}
              y={chartH - h}
              width={barW}
              height={h}
              rx={5}
              fill={color}
              opacity={0.85}
            />
            {d.value > 0 && (
              <text x={x + barW / 2} y={chartH - h - 5} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="Inter">
                {format(d.value)}
              </text>
            )}
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#94a3b8" fontFamily="Inter">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  data,
  height = 200,
  color = "#2563eb",
}: {
  data: { month: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const width = 460;
  const pad = 28;
  const chartH = height - 28;
  const max = Math.max(...data.map((d) => d.value), 1) * 1.1;
  const min = Math.min(...data.map((d) => d.value)) * 0.8;
  const stepX = (width - pad) / Math.max(data.length - 1, 1);
  const px = (i: number) => pad / 2 + i * stepX;
  const py = (v: number) => chartH - ((v - min) / (max - min || 1)) * (chartH - 10) - 5;
  const points = data.map((d, i) => `${px(i)},${py(d.value)}`);
  const area = `M ${px(0)},${chartH} L ${points.join(" L ")} L ${px(data.length - 1)},${chartH} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={0} x2={width} y1={chartH - chartH * t} y2={chartH - chartH * t} stroke="#eef1f6" strokeWidth={1} />
      ))}
      <path d={area} fill="url(#lg)" />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.month + i}>
          <title>{`${d.month}: ${d.value}`}</title>
          <circle cx={px(i)} cy={py(d.value)} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
          <text x={px(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="#94a3b8" fontFamily="Inter">
            {d.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({
  segments,
  size = 160,
  onSelect,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  onSelect?: (label: string) => void;
}) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = size / 2 - 14;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#eef1f6" strokeWidth={18} />
        {segments.map((s) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={18}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
              strokeLinecap="butt"
              onClick={onSelect ? () => onSelect(s.label) : undefined}
              className={onSelect ? "cursor-pointer transition-opacity hover:opacity-80" : undefined}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x={c} y={c - 2} textAnchor="middle" fontSize={22} fontWeight={700} fill="#0f172a" fontFamily="Inter">
          {total}
        </text>
        <text x={c} y={c + 16} textAnchor="middle" fontSize={11} fill="#94a3b8" fontFamily="Inter">
          Total
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((s) => {
          const inner = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="text-ink-700">{s.label}</span>
              <span className="ml-auto pl-3 font-semibold text-ink-900 tabular">{s.value}</span>
            </>
          );
          return onSelect ? (
            <button key={s.label} type="button" onClick={() => onSelect(s.label)} className="-mx-1.5 flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left text-sm hover:bg-slate-50">
              {inner}
            </button>
          ) : (
            <div key={s.label} className="flex items-center gap-2 text-sm">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
