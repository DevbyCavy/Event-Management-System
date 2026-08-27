import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarPlus, CheckCircle2, Clock, Route, Truck } from 'lucide-react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import AnimatedNumber from '../../components/AnimatedNumber'
import BarChart from '../../components/BarChart'
import DonutChart from '../../components/DonutChart'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const TRIP_STATUS_STYLES = {
  scheduled: 'bg-gray-100 text-gray-600',
  en_route: 'bg-blue-100 text-blue-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  returning: 'bg-brand-100 text-brand-800',
  completed: 'bg-green-100 text-green-800',
}

const USAGE_COLORS = { available: '#10b981', in_use: '#f59e0b', maintenance: '#ef4444' }
const TRIP_STATUS_LABELS = { scheduled: 'Scheduled', en_route: 'En Route', arrived: 'Arrived', returning: 'Returning', completed: 'Completed' }

export default function VehiclesListPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [vehicles, setVehicles] = useState(null)
  const [assignments, setAssignments] = useState(null)
  const [events, setEvents] = useState([])
  const [staff, setStaff] = useState([])
  const [error, setError] = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const [assignError, setAssignError] = useState('')

  const load = () => {
    Promise.all([api.get('/vehicles/'), api.get('/vehicle-assignments/'), api.get('/events/'), api.get('/staff/')])
      .then(([vRes, aRes, eRes, sRes]) => {
        setVehicles(vRes.data.results ?? vRes.data)
        setAssignments(aRes.data.results ?? aRes.data)
        setEvents(eRes.data.results ?? eRes.data)
        setStaff(sRes.data.results ?? sRes.data)
      })
      .catch(() => setError('Could not load vehicles.'))
  }

  useEffect(load, [])

  const eventName = (id) => events.find((e) => e.id === id)?.name ?? `Event #${id}`
  const vehicleLabel = (id) => vehicles?.find((v) => v.id === id)?.plate_no ?? `Vehicle #${id}`

  if (error) return <p className="text-red-600">{error}</p>
  if (!vehicles || !assignments) return <SkeletonTable />

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Logistics</h1>
        <Link
          to="/vehicles/list"
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700"
        >
          View Vehicles
          <ArrowRight size={15} />
        </Link>
      </div>

      <FleetDashboard vehicles={vehicles} assignments={assignments} eventName={eventName} vehicleLabel={vehicleLabel} />

      {canManage && (
        <button
          onClick={() => setShowAssign(true)}
          aria-label="Assign Vehicle"
          title="Assign Vehicle"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <CalendarPlus size={24} />
        </button>
      )}

      {showAssign && (
        <AssignVehicleModal
          events={events}
          vehicles={vehicles.filter((v) => v.status === 'available')}
          staff={staff}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); load() }}
          error={assignError}
          setError={setAssignError}
        />
      )}
    </div>
  )
}

function FleetDashboard({ vehicles, assignments, eventName, vehicleLabel }) {
  const totalTrips = assignments.length
  const now = new Date()
  const thisMonthTrips = assignments.filter((a) => {
    const d = new Date(a.dispatch_time)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const activeTrips = assignments.filter((a) => a.trip?.status === 'en_route').length
  const completedTrips = assignments.filter((a) => a.trip?.status === 'completed').length
  const completedPct = totalTrips ? Math.round((completedTrips / totalTrips) * 100) : 0

  const availableCount = vehicles.filter((v) => v.status === 'available').length
  const inUseCount = vehicles.filter((v) => v.status === 'in_use').length
  const maintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length
  const fleetAvailability = vehicles.length ? Math.round((availableCount / vehicles.length) * 100) : 0

  const completedDurations = assignments
    .map((a) => a.trip)
    .filter((t) => t?.status === 'completed' && t.started_at && t.ended_at)
    .map((t) => (new Date(t.ended_at) - new Date(t.started_at)) / 60000)
  const avgDurationMin = completedDurations.length
    ? Math.round(completedDurations.reduce((sum, m) => sum + m, 0) / completedDurations.length)
    : null

  const usageSegments = [
    { label: 'Available', value: availableCount, color: USAGE_COLORS.available },
    { label: 'In Use', value: inUseCount, color: USAGE_COLORS.in_use },
    { label: 'In Maintenance', value: maintenanceCount, color: USAGE_COLORS.maintenance },
  ].filter((s) => s.value > 0)

  const recentTrips = [...assignments]
    .sort((a, b) => new Date(b.dispatch_time) - new Date(a.dispatch_time))
    .slice(0, 5)

  const statusCounts = Object.fromEntries(
    Object.keys(TRIP_STATUS_LABELS).map((key) => [key, assignments.filter((a) => a.trip?.status === key).length])
  )
  const statusChartData = Object.entries(TRIP_STATUS_LABELS).map(([key, label]) => ({ label, value: statusCounts[key] }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Route} color="bg-blue-500" label="Total Trips" value={totalTrips} sub={`${thisMonthTrips} this month`} />
        <StatCard icon={Truck} color="bg-purple-500" label="Active Trips" value={activeTrips} sub={`${completedPct}% completed`} />
        <StatCard icon={CheckCircle2} color="bg-emerald-500" label="Fleet Availability" value={fleetAvailability} isPercent sub={`${maintenanceCount} trucks under maintenance`} />
        <StatCard icon={Clock} color="bg-orange-500" label="Avg Trip Duration" value={avgDurationMin} isDuration sub={`Based on ${completedDurations.length} completed trips`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-gray-900">Vehicle Usage Summary</h2>
          {vehicles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No vehicles yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <DonutChart segments={usageSegments} centerValue={vehicles.length} centerLabel="Vehicles" />
              <div className="min-w-0 flex-1 space-y-2 text-sm">
                <UsageRow color={USAGE_COLORS.available} label="Available" value={`${availableCount} trucks`} />
                <UsageRow color={USAGE_COLORS.in_use} label="In Use" value={`${inUseCount} trucks`} />
                <UsageRow color={USAGE_COLORS.maintenance} label="In Maintenance" value={`${maintenanceCount} trucks`} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-3">
          <h2 className="mb-3 text-sm font-bold text-gray-900">Trip Tracking</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Vehicle</th>
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 pr-4 font-medium">Dispatch Time</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTrips.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 text-gray-700">{vehicleLabel(a.vehicle)}</td>
                    <td className="py-2 pr-4 text-gray-700">{eventName(a.event)}</td>
                    <td className="py-2 pr-4 text-gray-700">{new Date(a.dispatch_time).toLocaleString()}</td>
                    <td className="py-2">
                      <StatusBadge status={a.trip?.status} styles={TRIP_STATUS_STYLES} />
                    </td>
                  </tr>
                ))}
                {recentTrips.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">No trips yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-bold text-gray-900">Trips by Status</h2>
        <BarChart data={statusChartData} color="#084b9a" />
      </div>
    </div>
  )
}

function UsageRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-gray-700">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function StatCard({ icon: Icon, color, label, value, sub, isPercent, isDuration }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-white ${color}`}>
        <Icon size={16} />
      </span>
      <p className="text-2xl font-bold text-gray-900">
        {value == null ? (
          '—'
        ) : isPercent ? (
          <AnimatedNumber value={value} suffix="%" />
        ) : isDuration ? (
          <>
            <AnimatedNumber value={value} />
            <span className="text-base font-medium text-gray-500"> min</span>
          </>
        ) : (
          <AnimatedNumber value={value} />
        )}
      </p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {sub && <p className="mt-1 truncate text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

function AssignVehicleModal({ events, vehicles, staff, onClose, onAssigned, error, setError }) {
  const [form, setForm] = useState({ event: '', vehicle: '', driver: '', dispatch_time: '' })
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/vehicle-assignments/', form)
      onAssigned()
    } catch (err) {
      setError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not assign this vehicle.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Assign Vehicle" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Vehicle (available only)</span>
          <select required className="input" value={form.vehicle} onChange={set('vehicle')}>
            <option value="">Select a vehicle…</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_no} ({v.type})</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Driver</span>
          <select required className="input" value={form.driver} onChange={set('driver')}>
            <option value="">Select a driver…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Dispatch time</span>
          <input required type="datetime-local" className="input" value={form.dispatch_time} onChange={set('dispatch_time')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Assigning…' : 'Assign Vehicle'}
        </button>
      </form>
    </Modal>
  )
}
