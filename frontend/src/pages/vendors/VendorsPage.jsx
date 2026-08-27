import { useEffect, useState } from 'react'
import { Building2, Handshake } from 'lucide-react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const CONTRACT_STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-yellow-100 text-yellow-800',
  signed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

const TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'vendors', label: 'Vendors' },
]

export default function VendorsPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [activeTab, setActiveTab] = useState('bookings')
  const [vendors, setVendors] = useState(null)
  const [bookings, setBookings] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [showBookVendor, setShowBookVendor] = useState(false)

  const load = () => {
    Promise.all([api.get('/vendors/'), api.get('/event-vendors/'), api.get('/events/')])
      .then(([vRes, bRes, eRes]) => {
        setVendors(vRes.data.results ?? vRes.data)
        setBookings(bRes.data.results ?? bRes.data)
        setEvents(eRes.data.results ?? eRes.data)
      })
      .catch(() => setError('Could not load vendors.'))
  }

  useEffect(load, [])

  const vendorName = (id) => vendors?.find((v) => v.id === id)?.name ?? `Vendor #${id}`
  const eventName = (id) => events.find((e) => e.id === id)?.name ?? `Event #${id}`

  if (error) return <p className="text-red-600">{error}</p>
  if (!vendors || !bookings) return <SkeletonTable />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Vendors</h1>

      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-full bg-gray-100 p-1 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors duration-150 ${
              activeTab === tab.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.key === 'bookings' ? bookings.length : vendors.length})
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Vendor</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Agreed Price</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Deposit Paid</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{eventName(b.event)}</td>
                  <td className="px-4 py-2 text-gray-700">{vendorName(b.vendor)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{b.agreed_price}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{b.deposit_paid}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={b.contract_status} styles={CONTRACT_STATUS_STYLES} />
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{v.name}</td>
                  <td className="px-4 py-2 text-gray-700">{v.category}</td>
                  <td className="px-4 py-2 text-gray-700">{v.contact_email || v.contact_phone || '—'}</td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No vendors yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {canManage && activeTab === 'bookings' && (
        <button
          onClick={() => setShowBookVendor(true)}
          aria-label="Book Vendor"
          title="Book Vendor"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <Handshake size={24} />
        </button>
      )}
      {canManage && activeTab === 'vendors' && (
        <button
          onClick={() => setShowAddVendor(true)}
          aria-label="Add Vendor"
          title="Add Vendor"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <Building2 size={24} />
        </button>
      )}

      {showAddVendor && (
        <AddVendorModal onClose={() => setShowAddVendor(false)} onCreated={() => { setShowAddVendor(false); load() }} />
      )}
      {showBookVendor && (
        <BookVendorModal
          vendors={vendors}
          events={events}
          onClose={() => setShowBookVendor(false)}
          onBooked={() => { setShowBookVendor(false); load() }}
        />
      )}
    </div>
  )
}

function AddVendorModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', category: '', contact_email: '', contact_phone: '', notes: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/vendors/', form)
      onCreated()
    } catch {
      setError('Could not add this vendor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Vendor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Name</span>
          <input required className="input" value={form.name} onChange={set('name')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Category</span>
          <input required className="input" value={form.category} onChange={set('category')} placeholder="e.g. catering, decor" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Contact email</span>
          <input type="email" className="input" value={form.contact_email} onChange={set('contact_email')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Contact phone</span>
          <input className="input" value={form.contact_phone} onChange={set('contact_phone')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add Vendor'}
        </button>
      </form>
    </Modal>
  )
}

function BookVendorModal({ vendors, events, onClose, onBooked }) {
  const [form, setForm] = useState({ event: '', vendor: '', agreed_price: '', deposit_paid: '0' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/event-vendors/', form)
      onBooked()
    } catch {
      setError('Could not book this vendor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Book Vendor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Vendor</span>
          <select required className="input" value={form.vendor} onChange={set('vendor')}>
            <option value="">Select a vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Agreed price</span>
          <input required type="number" step="0.01" min="0" className="input" value={form.agreed_price} onChange={set('agreed_price')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Deposit paid</span>
          <input type="number" step="0.01" min="0" className="input" value={form.deposit_paid} onChange={set('deposit_paid')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Booking…' : 'Book Vendor'}
        </button>
      </form>
    </Modal>
  )
}
