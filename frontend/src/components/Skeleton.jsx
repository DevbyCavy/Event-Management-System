export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <SkeletonBlock className="h-3 w-24" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBlock key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <SkeletonBlock className="mb-3 h-4 w-1/3" />
      <SkeletonBlock className="mb-2 h-3 w-full" />
      <SkeletonBlock className="h-3 w-2/3" />
    </div>
  )
}
