import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const VEHICLE_STATUS_STYLES = {
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-red-100 text-red-700',
}

const TRIP_STATUS_STYLES = {
  scheduled: 'bg-gray-100 text-gray-600',
  en_route: 'bg-blue-100 text-blue-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  returning: 'bg-brand-100 text-brand-800',
  completed: 'bg-green-100 text-green-800',
}

export default function VehiclesListPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [vehicles, setVehicles] = useState(null)
  const [assignments, setAssignments] = useState(null)
  const [events, setEvents] = useState([])
  const [staff, setStaff] = useState([])
  const [error, setError] = useState('')
  const [showAddVehicle, setShowAddVehicle] = useState(false)
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
  const staffName = (id) => staff.find((s) => s.id === id)?.name ?? `Staff #${id}`
  const vehicleLabel = (id) => vehicles?.find((v) => v.id === id)?.plate_no ?? `Vehicle #${id}`

  if (error) return <p className="text-red-600">{error}</p>
  if (!vehicles || !assignments) return <SkeletonTable />

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          {canManage && (
            <button
              onClick={() => setShowAddVehicle(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add Vehicle
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Plate No.</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Capacity</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{v.plate_no}</td>
                  <td className="px-4 py-2 text-gray-700">{v.type}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{v.capacity}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={v.status} styles={VEHICLE_STATUS_STYLES} />
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No vehicles yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          {canManage && (
            <button
              onClick={() => setShowAssign(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Assign Vehicle
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Vehicle</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Driver</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Dispatch</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Trip Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{eventName(a.event)}</td>
                  <td className="px-4 py-2 text-gray-700">{vehicleLabel(a.vehicle)}</td>
                  <td className="px-4 py-2 text-gray-700">{staffName(a.driver)}</td>
                  <td className="px-4 py-2 text-gray-700">{new Date(a.dispatch_time).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={a.trip?.status} styles={TRIP_STATUS_STYLES} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/trips/${a.trip?.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                      View Trip
                    </Link>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No trips yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddVehicle && (
        <AddVehicleModal onClose={() => setShowAddVehicle(false)} onCreated={() => { setShowAddVehicle(false); load() }} />
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

function AddVehicleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ plate_no: '', type: '', capacity: 1 })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/vehicles/', form)
      onCreated()
    } catch {
      setError('Could not add this vehicle.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Vehicle" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Plate number</span>
          <input required className="input" value={form.plate_no} onChange={set('plate_no')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Type</span>
          <input required className="input" value={form.type} onChange={set('type')} placeholder="e.g. Van, Truck" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Capacity</span>
          <input required type="number" min="1" className="input" value={form.capacity} onChange={set('capacity')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add Vehicle'}
        </button>
      </form>
    </Modal>
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
