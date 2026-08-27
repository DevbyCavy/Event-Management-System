export default function StatusBadge({ status, styles = {}, className = '' }) {
  const isPending = status?.toLowerCase().includes('pending')
  const colorClasses = styles[status] ?? 'bg-gray-100 text-gray-600'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClasses} ${className}`}
    >
      {isPending && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {status?.replace(/_/g, ' ')}
    </span>
  )
}
