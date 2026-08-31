import { useEffect, useState } from 'react'
import { Eye, Pencil, Trash2, Truck } from 'lucide-react'
import api from '../../api/client'
import ConfirmModal from '../../components/ConfirmModal'
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

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'in_use', label: 'In Use' },
  { key: 'maintenance', label: 'Maintenance' },
]

export default function VehiclesCatalogPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [vehicles, setVehicles] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [viewVehicle, setViewVehicle] = useState(null)
  const [editVehicle, setEditVehicle] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = () => {
    api
      .get('/vehicles/')
      .then((res) => setVehicles(res.data.results ?? res.data))
      .catch(() => setError('Could not load vehicles.'))
  }

  useEffect(load, [])

  const deleteVehicle = async () => {
    const vehicle = confirmTarget
    setBusyId(vehicle.id)
    setActionError('')
    try {
      await api.delete(`/vehicles/${vehicle.id}/`)
      setConfirmTarget(null)
      load()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not delete this vehicle.')
      setConfirmTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!vehicles) return <SkeletonTable />

  const visibleVehicles = statusFilter === 'all' ? vehicles : vehicles.filter((v) => v.status === statusFilter)

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
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

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Plate No.</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Capacity</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleVehicles.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{v.plate_no}</td>
                <td className="px-4 py-2 text-gray-700">{v.type}</td>
                <td className="px-4 py-2 text-right text-gray-700">{v.capacity}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={v.status} styles={VEHICLE_STATUS_STYLES} />
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewVehicle(v)}
                      title="View vehicle"
                      aria-label="View vehicle"
                      className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                    >
                      <Eye size={16} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => setEditVehicle(v)}
                          title="Edit vehicle"
                          aria-label="Edit vehicle"
                          className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmTarget(v)}
                          disabled={busyId === v.id}
                          title="Delete vehicle"
                          aria-label="Delete vehicle"
                          className="text-gray-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleVehicles.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No vehicles match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <button
          onClick={() => setShowAddVehicle(true)}
          aria-label="Add Vehicle"
          title="Add Vehicle"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <Truck size={24} />
        </button>
      )}

      {showAddVehicle && (
        <VehicleFormModal title="Add Vehicle" onClose={() => setShowAddVehicle(false)} onSaved={() => { setShowAddVehicle(false); load() }} />
      )}
      {editVehicle && (
        <VehicleFormModal
          title="Edit Vehicle"
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onSaved={() => { setEditVehicle(null); load() }}
        />
      )}
      {viewVehicle && (
        <VehicleViewModal vehicle={viewVehicle} onClose={() => setViewVehicle(null)} />
      )}
      {confirmTarget && (
        <ConfirmModal
          title="Delete Vehicle"
          message={`Delete vehicle "${confirmTarget.plate_no}"? This cannot be undone.`}
          confirmLabel="Delete"
          busy={busyId === confirmTarget.id}
          onConfirm={deleteVehicle}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}

function VehicleViewModal({ vehicle, onClose }) {
  return (
    <Modal title="Vehicle Details" onClose={onClose}>
      <div className="space-y-1 text-sm">
        <Row label="Plate number">{vehicle.plate_no}</Row>
        <Row label="Type">{vehicle.type}</Row>
        <Row label="Capacity">{vehicle.capacity}</Row>
        <Row label="Status" last>
          <StatusBadge status={vehicle.status} styles={VEHICLE_STATUS_STYLES} />
        </Row>
      </div>
    </Modal>
  )
}

function Row({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-1.5 ${last ? '' : 'border-b border-gray-100'}`}>
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}

function VehicleFormModal({ title, vehicle, onClose, onSaved }) {
  const [form, setForm] = useState(
    vehicle
      ? { plate_no: vehicle.plate_no, type: vehicle.type, capacity: vehicle.capacity, status: vehicle.status }
      : { plate_no: '', type: '', capacity: 1, status: 'available' }
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (vehicle) await api.patch(`/vehicles/${vehicle.id}/`, form)
      else await api.post('/vehicles/', form)
      onSaved()
    } catch {
      setError(`Could not ${vehicle ? 'save' : 'add'} this vehicle.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
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
        {vehicle && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Status</span>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : vehicle ? 'Save changes' : 'Add Vehicle'}
        </button>
      </form>
    </Modal>
  )
}
