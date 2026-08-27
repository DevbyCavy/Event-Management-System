import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  new: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}

const EMPTY_INQUIRY = {
  client_name: '', contact: '', event_type: '', date_requested: '', budget_range: '', notes: '',
}

export default function InquiriesListPage() {
  const [inquiries, setInquiries] = useState(null)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [convertingId, setConvertingId] = useState(null)

  const load = () => {
    api
      .get('/inquiries/')
      .then((res) => setInquiries(res.data.results ?? res.data))
      .catch(() => setError('Could not load inquiries.'))
  }

  useEffect(load, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!inquiries) return <SkeletonTable />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Inquiries</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          New Inquiry
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Client</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event Type</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Date Requested</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inquiries.map((inquiry) => (
              <tr key={inquiry.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{inquiry.client_name}</td>
                <td className="px-4 py-2 text-gray-700">{inquiry.event_type}</td>
                <td className="px-4 py-2 text-gray-700">{inquiry.date_requested}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={inquiry.status} styles={STATUS_STYLES} />
                </td>
                <td className="px-4 py-2 text-right">
                  {inquiry.status === 'new' && (
                    <button
                      onClick={() => setConvertingId(inquiry.id)}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      Convert to Order
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No inquiries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateInquiryModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
      {convertingId && (
        <ConvertToOrderModal
          inquiryId={convertingId}
          onClose={() => setConvertingId(null)}
          onConverted={() => { setConvertingId(null); load() }}
        />
      )}
    </div>
  )
}

function CreateInquiryModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_INQUIRY)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/inquiries/', form)
      onCreated()
    } catch {
      setError('Could not create this inquiry. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="New Inquiry" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Client name">
          <input required className="input" value={form.client_name} onChange={set('client_name')} />
        </Field>
        <Field label="Contact">
          <input required className="input" value={form.contact} onChange={set('contact')} />
        </Field>
        <Field label="Event type">
          <input required className="input" value={form.event_type} onChange={set('event_type')} />
        </Field>
        <Field label="Date requested">
          <input required type="date" className="input" value={form.date_requested} onChange={set('date_requested')} />
        </Field>
        <Field label="Budget range">
          <input className="input" value={form.budget_range} onChange={set('budget_range')} placeholder="e.g. 10000-20000" />
        </Field>
        <Field label="Notes">
          <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Inquiry'}
        </button>
      </form>
    </Modal>
  )
}

function ConvertToOrderModal({ inquiryId, onClose, onConverted }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    client_id: '', planner_id: user?.id ?? '', name: '', type: '',
    date_start: '', date_end: '', venue: '', classification: 'middle',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data.results ?? res.data)).catch(() => {})
  }, [])

  const clients = users.filter((u) => u.groups.includes('Client'))
  const planners = users.filter((u) => u.groups.includes('Event Planner') || u.is_superuser)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/inquiries/${inquiryId}/convert-to-order/`, form)
      onConverted()
    } catch {
      setError('Could not convert this inquiry. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Convert to Order" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Client">
          <select required className="input" value={form.client_id} onChange={set('client_id')}>
            <option value="">Select a client…</option>
            {clients.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </Field>
        <Field label="Planner">
          <select required className="input" value={form.planner_id} onChange={set('planner_id')}>
            {planners.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </Field>
        <Field label="Event name">
          <input required className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Event type">
          <input required className="input" value={form.type} onChange={set('type')} />
        </Field>
        <Field label="Venue">
          <input required className="input" value={form.venue} onChange={set('venue')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts">
            <input required type="datetime-local" className="input" value={form.date_start} onChange={set('date_start')} />
          </Field>
          <Field label="Ends">
            <input required type="datetime-local" className="input" value={form.date_end} onChange={set('date_end')} />
          </Field>
        </div>
        <Field label="Classification">
          <select className="input" value={form.classification} onChange={set('classification')}>
            <option value="high">High</option>
            <option value="middle">Middle</option>
            <option value="low">Low</option>
          </select>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Converting…' : 'Convert to Order'}
        </button>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}
