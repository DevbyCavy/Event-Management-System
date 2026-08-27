export default function BarChart({ data, color = '#2563eb', barAreaHeight = 140, valueFormatter = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-gray-500">{d.value > 0 ? valueFormatter(d.value) : ''}</span>
          <div className="flex w-full items-end justify-center" style={{ height: barAreaHeight }}>
            <div
              className="w-full max-w-[28px] rounded-t-md transition-all duration-500 ease-out"
              style={{ height: `${Math.max((d.value / max) * 100, 2)}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-[11px] text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
