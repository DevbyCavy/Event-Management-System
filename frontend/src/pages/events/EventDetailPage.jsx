import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import StatusTimeline from '../../components/StatusTimeline'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'

export default function EventDetailPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const toast = useToast()
  const [event, setEvent] = useState(null)
  const [order, setOrder] = useState(null)
  const [budget, setBudget] = useState(null)
  const [hasBoq, setHasBoq] = useState(false)
  const [hasStaffing, setHasStaffing] = useState(false)
  const [error, setError] = useState('')
  const [savingClassification, setSavingClassification] = useState(false)

  const isAdmin = hasRole(roles.ADMIN)
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  useEffect(() => {
    api
      .get(`/events/${id}/`)
      .then((res) => setEvent(res.data))
      .catch(() => setError('Could not load this event.'))

    api
      .get('/orders/')
      .then((res) => {
        const orders = res.data.results ?? res.data
        const found = orders.find((o) => String(o.event) === id) ?? null
        setOrder(found)
        if (found && isPlannerOrAdmin) {
          api.get('/boqs/').then((bRes) => {
            const boqs = bRes.data.results ?? bRes.data
            setHasBoq(boqs.some((b) => b.event === found.id))
          }).catch(() => {})
        }
      })
      .catch(() => {})

    if (isPlannerOrAdmin) {
      api
        .get(`/budget-items/totals/?event=${id}`)
        .then((res) => setBudget(res.data))
        .catch(() => {})

      api
        .get('/event-team-assignments/')
        .then((res) => {
          const assignments = res.data.results ?? res.data
          setHasStaffing(assignments.some((a) => String(a.event) === id))
        })
        .catch(() => {})
    }
  }, [id, isPlannerOrAdmin])

  const handleClassificationChange = async (e) => {
    const classification = e.target.value
    setSavingClassification(true)
    try {
      const res = await api.patch(`/events/${id}/`, { classification })
      setEvent(res.data)
      toast.success('Classification updated.')
    } catch {
      setError('Could not update classification.')
      toast.error('Could not update classification.')
    } finally {
      setSavingClassification(false)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!event) return <SkeletonCard />

  let currentIndex = 1
  if (order?.order_status === 'approved') currentIndex = 2
  if (hasBoq) currentIndex = 3
  if (hasStaffing) currentIndex = 4
  if (event.event_status === 'processed') currentIndex = 5
  if (event.event_status === 'done') currentIndex = 6

  return (
    <div className="max-w-4xl">
      <Link to="/events" className="text-sm text-brand-700 hover:underline">
        ← Back to events
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-gray-900">{event.name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Stage</h2>
          <StatusTimeline currentIndex={currentIndex} />
        </section>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Event</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Type" value={event.type} />
              <Row label="Venue" value={event.venue} />
              <Row label="Starts" value={new Date(event.date_start).toLocaleString()} />
              <Row label="Ends" value={new Date(event.date_end).toLocaleString()} />
              <Row label="Status" value={event.event_status} />
              <div className="flex items-center justify-between py-1">
                <dt className="text-gray-500">Classification</dt>
                <dd>
                  {isAdmin ? (
                    <select
                      value={event.classification}
                      onChange={handleClassificationChange}
                      disabled={savingClassification}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm transition-colors duration-150 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="middle">Middle</option>
                      <option value="low">Low</option>
                    </select>
                  ) : (
                    <span className="capitalize">{event.classification}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Order</h2>
            {order ? (
              <dl className="space-y-2 text-sm">
                <Row label="Status" value={order.order_status} />
                <Row label="Signed at" value={order.signed_at ? new Date(order.signed_at).toLocaleString() : '—'} />
                <Row label="Approved at" value={order.approved_at ? new Date(order.approved_at).toLocaleString() : '—'} />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No order found for this event.</p>
            )}
          </section>

          {budget && (
            <section className="col-span-1 rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Budget Summary</h2>
              <dl className="grid grid-cols-3 gap-4 text-sm">
                <Row label="Planned" value={budget.planned_total} />
                <Row label="Actual" value={budget.actual_total} />
                <Row label="Variance" value={budget.variance} />
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}
