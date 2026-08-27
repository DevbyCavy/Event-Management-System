export const RETURN_STATUS_STYLES = {
  returned: 'bg-green-100 text-green-800',
  missing: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-800',
}

export function returnStatus(stockOut) {
  if (stockOut.returned) return 'returned'
  if (stockOut.missing_reported_at) return 'missing'
  return 'pending'
}
