export default function MiniBarChart({ data, color = '#084b9a' }) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex h-32 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-24 w-full items-end">
            <div
              className="w-full rounded-t-sm transition-all duration-700 ease-out"
              style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, minHeight: d.value > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[10px] text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
