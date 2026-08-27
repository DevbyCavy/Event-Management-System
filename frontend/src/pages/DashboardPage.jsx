import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  FileText,
  Inbox,
  ListChecks,
  PenSquare,
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import * as roles from '../roles'
import AnimatedNumber from '../components/AnimatedNumber'
import MiniBarChart from '../components/MiniBarChart'
import RadialProgress from '../components/RadialProgress'
import StatusBadge from '../components/StatusBadge'
import { SkeletonBlock, SkeletonCard, SkeletonTable } from '../components/Skeleton'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
}

const QUICK_LINKS = [
  { to: '/inquiries', label: 'Inquiries', icon: Inbox, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/orders', label: 'Orders', icon: FileText, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/boqs', label: 'BOQs', icon: ListChecks, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/requisitions', label: 'Requisitions', icon: ClipboardList, roles: [roles.ADMIN, roles.EVENT_PLANNER, roles.ACCOUNTS] },
  { to: '/products', label: 'Store Inventory', icon: Boxes, roles: [roles.ADMIN, roles.STOREKEEPER] },
]

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const [events, setEvents] = useState(null)
  const [requisitions, setRequisitions] = useState(null)
  const [boqFulfillment, setBoqFulfillment] = useState(null)
  const [lowStockCount, setLowStockCount] = useState(null)

  const canSeeRequisitions = hasRole(roles.ADMIN, roles.EVENT_PLANNER, roles.ACCOUNTS)
  const canSeeBoqs = hasRole(roles.ADMIN, roles.EVENT_PLANNER)
  const canSeeStock = hasRole(roles.ADMIN, roles.STOREKEEPER)

  useEffect(() => {
    api.get('/events/').then((res) => setEvents(res.data.results ?? res.data)).catch(() => setEvents([]))
  }, [])

  useEffect(() => {
    if (canSeeRequisitions) {
      api.get('/requisitions/').then((res) => setRequisitions(res.data.results ?? res.data)).catch(() => setRequisitions([]))
    }
  }, [canSeeRequisitions])

  useEffect(() => {
    if (canSeeBoqs) {
      api.get('/boqs/').then((res) => {
        const boqs = res.data.results ?? res.data
        const items = boqs.flatMap((b) => b.items)
        const fulfilled = items.filter((i) => i.status === 'stock_deducted' || i.status === 'fulfilled').length
        setBoqFulfillment(items.length ? Math.round((fulfilled / items.length) * 100) : 0)
      }).catch(() => setBoqFulfillment(0))
    }
  }, [canSeeBoqs])

  useEffect(() => {
    if (canSeeStock) {
      api.get('/products/low-stock/').then((res) => setLowStockCount(res.data.length)).catch(() => setLowStockCount(0))
    }
  }, [canSeeStock])

  const visibleLinks = QUICK_LINKS.filter((l) => hasRole(...l.roles))
  const recentEvents = events?.slice(0, 6) ?? []
  const pendingRequisitions = requisitions?.filter((r) => r.status === 'pending') ?? []

  const categoryData = requisitions
    ? Object.entries(
        requisitions.reduce((acc, r) => {
          acc[r.category] = (acc[r.category] || 0) + 1
          return acc
        }, {})
      ).map(([label, value]) => ({ label: label.replace('_', ' '), value }))
    : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {user?.username}</h1>
        <p className="text-sm text-gray-500">
          {user?.is_superuser ? 'Superuser' : user?.groups?.join(', ') || 'No role assigned yet'}
        </p>
      </div>

      {visibleLinks.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon size={20} />
              </span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr_260px]">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent Events</h2>
          {events === null ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <ul className="space-y-1">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/events/${e.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <span className="truncate">{e.name}</span>
                    <PenSquare size={13} className="shrink-0 text-gray-300" />
                  </Link>
                </li>
              ))}
              {recentEvents.length === 0 && <p className="px-2 py-2 text-sm text-gray-400">No events yet.</p>}
            </ul>
          )}
        </section>

        <section className="space-y-6">
          {canSeeRequisitions && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Pending Requisitions</h2>
              {requisitions === null ? (
                <SkeletonTable rows={3} cols={3} />
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400">
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingRequisitions.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-4 text-gray-700">{r.description}</td>
                        <td className="py-2 pr-4 text-gray-700">{r.amount_estimate}</td>
                        <td className="py-2">
                          <StatusBadge status={r.status} styles={STATUS_STYLES} />
                        </td>
                      </tr>
                    ))}
                    {pendingRequisitions.length === 0 && (
                      <tr><td colSpan={3} className="py-3 text-gray-400">Nothing pending.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {canSeeRequisitions && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Requisitions by Category</h2>
              {requisitions === null ? (
                <SkeletonBlock className="h-32 w-full" />
              ) : categoryData.length > 0 ? (
                <MiniBarChart data={categoryData} />
              ) : (
                <p className="text-sm text-gray-400">No requisitions yet.</p>
              )}
            </div>
          )}

          {!canSeeRequisitions && <SkeletonCard />}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Overview</h2>
          {canSeeBoqs && (
            <div className="mb-4 flex justify-center">
              {boqFulfillment === null ? (
                <SkeletonBlock className="h-40 w-40 rounded-full" />
              ) : (
                <RadialProgress value={boqFulfillment} label="BOQ fulfilled" color="#084b9a" />
              )}
            </div>
          )}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            {canSeeRequisitions && (
              <StatRow label="Pending requisitions" value={requisitions ? pendingRequisitions.length : null} />
            )}
            {canSeeStock && <StatRow label="Low-stock items" value={lowStockCount} accent="text-yellow-600" />}
            <StatRow label="Total events" value={events ? events.length : null} />
          </div>
        </section>
      </div>
    </div>
  )
}

function StatRow({ label, value, accent = 'text-brand-600' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {value === null ? (
        <SkeletonBlock className="h-4 w-8" />
      ) : (
        <span className={`font-semibold ${accent}`}>
          <AnimatedNumber value={value} />
        </span>
      )}
    </div>
  )
}
