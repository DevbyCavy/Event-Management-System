import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleCheck, HardHat, Inbox, MapPin, XCircle, Zap } from 'lucide-react'
import api from '../api/client'
import ConfirmModal from './ConfirmModal'
import { SkeletonBlock } from './Skeleton'

const TABS = [
  { key: 'new', label: 'New Orders', statuses: ['new', 'assigned'] },
  { key: 'ongoing', label: 'On Going', statuses: ['ongoing'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
]

const STATUS_STYLE = {
  new: { Icon: Zap, tile: 'bg-orange-100 text-orange-600' },
  assigned: { Icon: Zap, tile: 'bg-orange-100 text-orange-600' },
  ongoing: { Icon: HardHat, tile: 'bg-purple-100 text-purple-600' },
  completed: { Icon: CircleCheck, tile: 'bg-green-100 text-green-600' },
}

const MAX_TIMEOUT_DELAY = 24 * 60 * 60 * 1000 // browser setTimeout overflows past ~24.8 days; cap and re-check

export default function OrdersKanbanWidget() {
  const [orders, setOrders] = useState(null)
  const [events, setEvents] = useState([])
  const [boqOrderIds, setBoqOrderIds] = useState(new Set())
  const [teamsByEvent, setTeamsByEvent] = useState({})
  const [activeTab, setActiveTab] = useState('new')
  const [busyId, setBusyId] = useState(null)
  const [confirmOrder, setConfirmOrder] = useState(null)

  const load = useCallback(() => {
    Promise.all([
      api.get('/orders/'),
      api.get('/events/'),
      api.get('/boqs/'),
      api.get('/event-team-assignments/'),
      api.get('/teams/'),
    ]).then(([oRes, eRes, bRes, aRes, tRes]) => {
      setOrders(oRes.data.results ?? oRes.data)
      setEvents(eRes.data.results ?? eRes.data)

      const boqs = bRes.data.results ?? bRes.data
      setBoqOrderIds(new Set(boqs.map((b) => b.event)))

      const assignments = aRes.data.results ?? aRes.data
      const teams = tRes.data.results ?? tRes.data
      const teamName = (id) => teams.find((t) => t.id === id)?.name
      const byEvent = {}
      assignments.forEach((a) => {
        byEvent[a.event] = byEvent[a.event] || []
        const name = teamName(a.team)
        if (name) byEvent[a.event].push(name)
      })
      setTeamsByEvent(byEvent)
    }).catch(() => setOrders([]))
  }, [])

  useEffect(load, [load])

  const eventFor = (order) => events.find((e) => e.id === order.event)

  const handleDone = async () => {
    const order = confirmOrder
    setBusyId(order.id)
    try {
      await api.post(`/orders/${order.id}/complete/`)
      setConfirmOrder(null)
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (orders === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <SkeletonBlock className="mb-3 h-5 w-32" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    )
  }

  const tabCounts = Object.fromEntries(
    TABS.map((t) => [t.key, orders.filter((o) => t.statuses.includes(o.execution_status)).length])
  )
  const activeOrders = orders.filter((o) => TABS.find((t) => t.key === activeTab).statuses.includes(o.execution_status))
  const visibleOrders = activeOrders.slice(0, 3)
  const hasMore = activeOrders.length > 3

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">Orders</h2>
      </div>

      <div className="mb-3 flex flex-wrap gap-1 rounded-full bg-gray-100 p-1 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3 py-1 font-medium transition-colors duration-150 ${
              activeTab === tab.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {visibleOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
          <Inbox size={28} />
          <p className="text-sm">Nothing here yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                event={eventFor(order)}
                hasBoq={boqOrderIds.has(order.id)}
                teamNames={teamsByEvent[order.event] ?? []}
                busy={busyId === order.id}
                onDone={() => setConfirmOrder(order)}
                onTransition={load}
              />
            ))}
          </div>
          {hasMore && (
            <Link
              to="/orders"
              className="mt-3 block text-center text-xs font-medium text-brand-700 hover:underline"
            >
              Show more
            </Link>
          )}
        </>
      )}

      {confirmOrder && (
        <ConfirmModal
          title="Mark as Completed"
          message="Mark this order as completed?"
          confirmLabel="Mark Completed"
          danger={false}
          busy={busyId === confirmOrder.id}
          onConfirm={handleDone}
          onCancel={() => setConfirmOrder(null)}
        />
      )}
    </div>
  )
}

function OrderCard({ order, event, hasBoq, teamNames, busy, onDone, onTransition }) {
  useEffect(() => {
    let target = null
    if (order.execution_status === 'ongoing' && order.ongoing_since) {
      target = new Date(order.ongoing_since).getTime() + 24 * 60 * 60 * 1000
    } else if (order.execution_status !== 'completed' && order.deadline_datetime) {
      target = new Date(order.deadline_datetime).getTime()
    }
    if (target === null) return

    let timer
    const schedule = () => {
      const delay = Math.max(0, target - Date.now())
      timer = setTimeout(() => {
        if (Date.now() >= target) onTransition()
        else schedule()
      }, Math.min(delay, MAX_TIMEOUT_DELAY))
    }
    schedule()
    return () => clearTimeout(timer)
  }, [order.execution_status, order.ongoing_since, order.deadline_datetime, onTransition])

  const { Icon, tile } = STATUS_STYLE[order.execution_status] ?? STATUS_STYLE.new
  const orderNumber = `#${String(order.id).padStart(3, '0')}`

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-brand-900 p-3 text-sm transition-all duration-[1000ms] ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-brand-800 hover:shadow-lg hover:shadow-brand-900/50">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tile}`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{event?.name ?? `Order ${orderNumber}`}</p>
          <p className="text-xs text-brand-200">Order {orderNumber}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-brand-100">
        <MapPin size={13} className="shrink-0" />
        <span className="truncate">{event?.venue ?? 'No location'}</span>
      </div>

      <div className="text-xs text-brand-100">
        {order.deadline_datetime ? new Date(order.deadline_datetime).toLocaleString() : 'No deadline'}
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        {hasBoq ? (
          <>
            <CheckCircle2 size={13} className="shrink-0 text-green-400" />
            <Link to="/boqs" className="text-brand-100 hover:text-white hover:underline">B.O.Q uploaded</Link>
          </>
        ) : (
          <>
            <XCircle size={13} className="shrink-0 text-red-400" />
            <span className="text-brand-200">No B.O.Q</span>
          </>
        )}
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer font-medium text-brand-100">Team</summary>
        <p className="mt-1 text-brand-200">
          {teamNames.length > 0 ? teamNames.join(', ') : 'No one assigned'}
        </p>
      </details>

      <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2">
        {event ? (
          <Link to={`/events/${event.id}`} className="text-xs font-medium text-white hover:underline">
            Manage
          </Link>
        ) : (
          <span className="text-xs text-brand-300">Manage</span>
        )}
        {order.execution_status === 'ongoing' && (
          <button
            onClick={onDone}
            disabled={busy}
            className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}
