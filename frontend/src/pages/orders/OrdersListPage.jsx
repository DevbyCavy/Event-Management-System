import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, ClipboardPlus, Eye, Pencil, Trash2 } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import ConfirmModal from '../../components/ConfirmModal'
import CreateOrderModal from '../../components/CreateOrderModal'
import OrderViewModal from '../../components/OrderViewModal'
import OrderEditModal from '../../components/OrderEditModal'
import ReturnsChecklistModal from '../../components/ReturnsChecklistModal'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  signed: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

const EXECUTION_STYLES = {
  new: 'bg-orange-100 text-orange-600',
  assigned: 'bg-orange-100 text-orange-600',
  ongoing: 'bg-purple-100 text-purple-600',
  completed: 'bg-green-100 text-green-600',
}

const EXECUTION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New', statuses: ['new', 'assigned'] },
  { key: 'ongoing', label: 'Ongoing', statuses: ['ongoing'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
]

export default function OrdersListPage() {
  const { user, hasRole } = useAuth()
  const [orders, setOrders] = useState(null)
  const [events, setEvents] = useState({})
  const [users, setUsers] = useState([])
  const [boqByOrder, setBoqByOrder] = useState({})
  const [stockOuts, setStockOuts] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [executionFilter, setExecutionFilter] = useState('all')
  const [returnsOrder, setReturnsOrder] = useState(null)

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
  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data.results ?? res.data)).catch(() => {})
  }, [])
  useEffect(() => {
    api
      .get('/boqs/')
      .then((res) => {
        const list = res.data.results ?? res.data
        setBoqByOrder(Object.fromEntries(list.map((b) => [b.event, b.id])))
      })
      .catch(() => {})
  }, [])
  const loadReturnsState = () => {
    api.get('/stock-out/').then((res) => setStockOuts(res.data.results ?? res.data)).catch(() => {})
  }
  useEffect(loadReturnsState, [])

  const canSign = (order) => order.order_status === 'draft' && (isPlannerOrAdmin || events[order.event]?.client === user?.id)
  const canApprove = (order) => order.order_status === 'signed' && isPlannerOrAdmin
  const canDelete = (order) => isPlannerOrAdmin && order.order_status !== 'approved'
  const canEdit = (order) => isPlannerOrAdmin && order.execution_status !== 'completed'

  const needsReturnsChecklist = (order) => {
    const returnable = stockOuts.filter((so) => so.product_returnable && so.event === order.event)
    return returnable.length > 0 && returnable.some((so) => !so.returned && !so.missing_reported_at)
  }

  const deleteOrder = async () => {
    const order = confirmTarget
    setBusyId(order.id)
    setActionError('')
    try {
      await api.delete(`/orders/${order.id}/`)
      setConfirmTarget(null)
      load()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not delete this order.')
      setConfirmTarget(null)
    } finally {
      setBusyId(null)
    }
  }

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

  const executionStatuses = EXECUTION_FILTERS.find((f) => f.key === executionFilter)?.statuses
  const visibleOrders = executionStatuses
    ? orders.filter((o) => executionStatuses.includes(o.execution_status))
    : orders

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {EXECUTION_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setExecutionFilter(f.key)}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors duration-150 ${
                executionFilter === f.key
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Execution</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Signed</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Approved</th>
              <th className="px-4 py-2" />
              <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/events/${order.event}`} className="text-brand-700 hover:underline">
                    {events[order.event]?.name ?? `Event #${order.event}`}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={order.order_status} styles={STATUS_STYLES} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge
                    status={order.execution_status === 'assigned' ? 'new' : order.execution_status}
                    styles={EXECUTION_STYLES}
                  />
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
                  {order.execution_status === 'completed' && boqByOrder[order.id] && needsReturnsChecklist(order) && (
                    <button
                      onClick={() => setReturnsOrder(order)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <ClipboardCheck size={14} />
                      Returns Checklist
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewOrder(order)}
                      title="View order info"
                      aria-label="View order info"
                      className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                    >
                      <Eye size={16} />
                    </button>
                    {canEdit(order) && (
                      <button
                        onClick={() => setEditOrder(order)}
                        title="Edit order"
                        aria-label="Edit order"
                        className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {canDelete(order) && (
                      <button
                        onClick={() => setConfirmTarget(order)}
                        disabled={busyId === order.id}
                        title="Delete order"
                        aria-label="Delete order"
                        className="text-gray-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPlannerOrAdmin && (
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Create Order"
          title="Create Order"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <ClipboardPlus size={24} />
        </button>
      )}

      {showCreate && (
        <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
      {viewOrder && (
        <OrderViewModal
          order={viewOrder}
          event={events[viewOrder.event]}
          users={users}
          onClose={() => setViewOrder(null)}
        />
      )}
      {editOrder && (
        <OrderEditModal
          order={editOrder}
          event={events[editOrder.event]}
          users={users}
          onClose={() => setEditOrder(null)}
          onSaved={() => { setEditOrder(null); load() }}
        />
      )}
      {confirmTarget && (
        <ConfirmModal
          title="Delete Order"
          message={`Delete the order for "${events[confirmTarget.event]?.name ?? `Event #${confirmTarget.event}`}"? This cannot be undone.`}
          confirmLabel="Delete"
          busy={busyId === confirmTarget.id}
          onConfirm={deleteOrder}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
      {returnsOrder && (
        <ReturnsChecklistModal
          eventId={returnsOrder.event}
          eventName={events[returnsOrder.event]?.name ?? `Event #${returnsOrder.event}`}
          onClose={() => setReturnsOrder(null)}
          onDone={() => { setReturnsOrder(null); loadReturnsState() }}
        />
      )}
    </div>
  )
}
