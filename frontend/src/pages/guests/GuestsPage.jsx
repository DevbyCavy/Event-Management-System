import { useEffect, useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'
import RadialProgress from '../../components/RadialProgress'

const RSVP_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-700',
  maybe: 'bg-yellow-100 text-yellow-800',
}

export default function GuestsPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [guests, setGuests] = useState(null)
  const [events, setEvents] = useState([])
  const [eventFilter, setEventFilter] = useState('')
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

  const load = () => {
    Promise.all([api.get('/guests/'), api.get('/events/')])
      .then(([gRes, eRes]) => {
        setGuests(gRes.data.results ?? gRes.data)
        setEvents(eRes.data.results ?? eRes.data)
      })
      .catch(() => setError('Could not load guests.'))
  }

  useEffect(load, [])

  const eventName = (id) => events.find((e) => e.id === id)?.name ?? `Event #${id}`
  const visibleGuests = eventFilter ? guests?.filter((g) => String(g.event) === eventFilter) : guests

  if (error) return <p className="text-red-600">{error}</p>
  if (!guests) return <SkeletonTable />

  const total = visibleGuests?.length ?? 0
  const accepted = visibleGuests?.filter((g) => g.rsvp_status === 'accepted').length ?? 0
  const acceptedPct = total > 0 ? Math.round((accepted / total) * 100) : 0

  return (
    <div>
      {total > 0 && (
        <section className="mb-6 flex flex-wrap items-center gap-8 rounded-xl border border-gray-200 bg-white p-6">
          <RadialProgress value={acceptedPct} label="RSVPs accepted" color="#084b9a" size={120} stroke={10} />
          <div className="space-y-1 text-sm text-gray-500">
            <p>{accepted} of {total} guests have accepted</p>
          </div>
        </section>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
        <div className="flex items-center gap-3">
          <select className="input" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {canManage && (
            <>
              <button
                onClick={() => setShowBulkImport(true)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bulk Import
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Add Guest
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">RSVP</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">RSVP Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleGuests?.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{g.name}</td>
                <td className="px-4 py-2 text-gray-700">{eventName(g.event)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={g.rsvp_status} styles={RSVP_STYLES} />
                </td>
                <td className="px-4 py-2">
                  <a
                    href={`/rsvp/${g.rsvp_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    Open RSVP page
                  </a>
                </td>
              </tr>
            ))}
            {visibleGuests?.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No guests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddGuestModal events={events} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load() }} />
      )}
      {showBulkImport && (
        <BulkImportModal events={events} onClose={() => setShowBulkImport(false)} onImported={() => { setShowBulkImport(false); load() }} />
      )}
    </div>
  )
}

function AddGuestModal({ events, onClose, onCreated }) {
  const [form, setForm] = useState({ event: '', name: '', email: '', phone: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/guests/', form)
      onCreated()
    } catch {
      setError('Could not add this guest.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Guest" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Name</span>
          <input required className="input" value={form.name} onChange={set('name')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input type="email" className="input" value={form.email} onChange={set('email')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Phone</span>
          <input className="input" value={form.phone} onChange={set('phone')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add Guest'}
        </button>
      </form>
    </Modal>
  )
}

function BulkImportModal({ events, onClose, onImported }) {
  const [event, setEvent] = useState('')
  const [csv, setCsv] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const guests = csv
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, email] = line.split(',').map((s) => s.trim())
          return email ? { name, email } : { name }
        })
      await api.post('/guests/bulk-import/', { event, guests })
      onImported()
    } catch {
      setError('Could not import these guests.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Bulk Import Guests" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={event} onChange={(e) => setEvent(e.target.value)}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            One guest per line: <code className="text-xs">Name, email@example.com</code>
          </span>
          <textarea required className="input" rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Importing…' : 'Import Guests'}
        </button>
      </form>
    </Modal>
  )
}
