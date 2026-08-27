import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardPlus, Eye, Trash2 } from 'lucide-react'
import api from '../../api/client'
import BOQViewModal from '../../components/BOQViewModal'
import ConfirmModal from '../../components/ConfirmModal'
import CreateBOQModal from '../../components/CreateBOQModal'
import RejectBOQModal from '../../components/RejectBOQModal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export default function BOQsListPage() {
  const { hasRole } = useAuth()
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [boqs, setBoqs] = useState(null)
  const [orders, setOrders] = useState([])
  const [events, setEvents] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [viewId, setViewId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = () => {
    Promise.all([
      api.get('/boqs/'),
      api.get('/orders/'),
      api.get('/events/'),
    ])
      .then(([boqRes, orderRes, eventRes]) => {
        setBoqs(boqRes.data.results ?? boqRes.data)
        setOrders(orderRes.data.results ?? orderRes.data)
        setEvents(eventRes.data.results ?? eventRes.data)
      })
      .catch(() => setError('Could not load BOQs.'))
  }

  useEffect(load, [])
  useEffect(() => {
    api.get('/products/').then((res) => setProducts(res.data.results ?? res.data)).catch(() => {})
  }, [])

  const eventName = (orderId) => {
    const order = orders.find((o) => o.id === orderId)
    const event = order && events.find((e) => e.id === order.event)
    return event?.name ?? `Order #${orderId}`
  }

  const approvedOrdersWithoutBoq = orders.filter(
    (o) => o.order_status === 'approved' && !boqs?.some((b) => b.event === o.id)
  )

  const isEditable = (boq) => boq.status === 'pending' || boq.status === 'rejected'

  const deleteBoq = async () => {
    const boq = confirmTarget
    setBusyId(boq.id)
    setActionError('')
    try {
      await api.delete(`/boqs/${boq.id}/`)
      setConfirmTarget(null)
      load()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not delete this BOQ.')
      setConfirmTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  const runAction = async (boq, action) => {
    setBusyId(boq.id)
    setActionError('')
    try {
      await api.post(`/boqs/${boq.id}/${action}/`)
      load()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!boqs) return <SkeletonTable />

  const visibleBoqs = statusFilter === 'all' ? boqs : boqs.filter((b) => b.status === statusFilter)

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">BOQs</h1>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors duration-150 ${
                statusFilter === f.key
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
              <th className="px-4 py-2 text-left font-medium text-gray-500">Created</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Items</th>
              <th className="px-4 py-2" />
              <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleBoqs.map((boq) => (
              <tr key={boq.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/boqs/${boq.id}`} className="text-brand-700 hover:underline">
                    {eventName(boq.event)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{new Date(boq.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={boq.status} styles={STATUS_STYLES} />
                </td>
                <td className="px-4 py-2 text-gray-700">{boq.items.length}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  {isPlannerOrAdmin && boq.status === 'pending' && (
                    <>
                      <button
                        disabled={busyId === boq.id}
                        onClick={() => setRejectTarget(boq)}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        disabled={busyId === boq.id}
                        onClick={() => runAction(boq, 'approve')}
                        className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewId(boq.id)}
                      title="View BOQ"
                      aria-label="View BOQ"
                      className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                    >
                      <Eye size={16} />
                    </button>
                    {isPlannerOrAdmin && isEditable(boq) && boq.items.length === 0 && (
                      <button
                        onClick={() => setConfirmTarget(boq)}
                        disabled={busyId === boq.id}
                        title="Delete BOQ"
                        aria-label="Delete BOQ"
                        className="text-gray-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleBoqs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No BOQs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPlannerOrAdmin && (
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Create BOQ"
          title="Create BOQ"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <ClipboardPlus size={24} />
        </button>
      )}

      {showCreate && (
        <CreateBOQModal
          orders={approvedOrdersWithoutBoq}
          events={events}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}

      {viewId && (
        <BOQViewModal
          boq={boqs.find((b) => b.id === viewId)}
          eventName={eventName(boqs.find((b) => b.id === viewId).event)}
          products={products}
          onClose={() => setViewId(null)}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          title="Delete BOQ"
          message={`Delete the BOQ for "${eventName(confirmTarget.event)}"? This cannot be undone.`}
          confirmLabel="Delete"
          busy={busyId === confirmTarget.id}
          onConfirm={deleteBoq}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectBOQModal
          boq={rejectTarget}
          eventName={eventName(rejectTarget.event)}
          onClose={() => setRejectTarget(null)}
          onRejected={() => { setRejectTarget(null); load() }}
        />
      )}
    </div>
  )
}
