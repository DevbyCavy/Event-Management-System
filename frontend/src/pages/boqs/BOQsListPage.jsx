import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'

export default function BOQsListPage() {
  const { hasRole } = useAuth()
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [boqs, setBoqs] = useState(null)
  const [orders, setOrders] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')

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

  const eventName = (orderId) => {
    const order = orders.find((o) => o.id === orderId)
    const event = order && events.find((e) => e.id === order.event)
    return event?.name ?? `Order #${orderId}`
  }

  const approvedOrdersWithoutBoq = orders.filter(
    (o) => o.order_status === 'approved' && !boqs?.some((b) => b.event === o.id)
  )

  const handleCreate = async (orderId) => {
    setCreateError('')
    try {
      await api.post('/boqs/', { event: orderId })
      setShowCreate(false)
      load()
    } catch (err) {
      setCreateError(err.response?.data?.[0] ?? err.response?.data?.event?.[0] ?? 'Could not create BOQ.')
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!boqs) return <SkeletonTable />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">BOQs</h1>
        {isPlannerOrAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create BOQ
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Created</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {boqs.map((boq) => (
              <tr key={boq.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/boqs/${boq.id}`} className="text-brand-700 hover:underline">
                    {eventName(boq.event)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{new Date(boq.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-700">{boq.items.length}</td>
              </tr>
            ))}
            {boqs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No BOQs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="Create BOQ" onClose={() => setShowCreate(false)}>
          <p className="mb-3 text-sm text-gray-600">
            Select an approved order to create a BOQ for.
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {approvedOrdersWithoutBoq.map((order) => (
              <button
                key={order.id}
                onClick={() => handleCreate(order.id)}
                className="block w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {events.find((e) => e.id === order.event)?.name ?? `Event #${order.event}`}
              </button>
            ))}
            {approvedOrdersWithoutBoq.length === 0 && (
              <p className="text-sm text-gray-500">No approved orders without a BOQ yet.</p>
            )}
          </div>
          {createError && <p className="mt-3 text-sm text-red-600">{createError}</p>}
        </Modal>
      )}
    </div>
  )
}
