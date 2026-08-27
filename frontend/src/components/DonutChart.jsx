export default function DonutChart({ segments, size = 160, stroke = 22, centerValue, centerLabel }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  let cumulative = 0
  const arcs = segments.map((s) => {
    const fraction = s.value / total
    const dash = fraction * circumference
    const offset = -cumulative * circumference
    cumulative += fraction
    return { ...s, dash, offset }
  })

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f1f2" strokeWidth={stroke} />
        {arcs.map((s, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={s.offset}
            style={{ transition: 'stroke-dasharray 800ms ease-out' }}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{centerValue}</span>
        {centerLabel && <span className="text-xs text-gray-500">{centerLabel}</span>}
      </div>
    </div>
  )
}
