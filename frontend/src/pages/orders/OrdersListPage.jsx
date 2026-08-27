import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  signed: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrdersListPage() {
  const { user, hasRole } = useAuth()
  const [orders, setOrders] = useState(null)
  const [events, setEvents] = useState({})
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const load = () => {
    api
      .get('/orders/')
      .then((res) => {
        const list = res.data.results ?? res.data
        setOrders(list)
        return Promise.all(list.map((o) => api.get(`/events/${o.event}/`).then((r) => [o.event, r.data])))
      })
      .then((pairs) => setEvents(Object.fromEntries(pairs ?? [])))
      .catch(() => setError('Could not load orders.'))
  }

  useEffect(load, [])

  const canSign = (order) => order.order_status === 'draft' && (isPlannerOrAdmin || events[order.event]?.client === user?.id)
  const canApprove = (order) => order.order_status === 'signed' && isPlannerOrAdmin

  const runAction = async (order, action) => {
    setBusyId(order.id)
    setActionError('')
    try {
      await api.post(`/orders/${order.id}/${action}/`)
      load()
    } catch (err) {
      const detail = err.response?.data?.blocked_by_policy
        ? `Blocked by policy: ${err.response.data.blocked_by_policy.map((p) => p.title).join(', ')}`
        : Array.isArray(err.response?.data)
          ? err.response.data.join(' ')
          : 'Action failed.'
      setActionError(detail)
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!orders) return <SkeletonTable />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Orders</h1>
      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Signed</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Approved</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/events/${order.event}`} className="text-brand-700 hover:underline">
                    {events[order.event]?.name ?? `Event #${order.event}`}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={order.order_status} styles={STATUS_STYLES} />
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {order.signed_at ? new Date(order.signed_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {order.approved_at ? new Date(order.approved_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  {canSign(order) && (
                    <button
                      disabled={busyId === order.id}
                      onClick={() => runAction(order, 'sign')}
                      className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                    >
                      Sign
                    </button>
                  )}
                  {canApprove(order) && (
                    <button
                      disabled={busyId === order.id}
                      onClick={() => runAction(order, 'approve')}
                      className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
