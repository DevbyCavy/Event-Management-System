import { useEffect, useState } from 'react'
import api from '../api/client'
import Modal from './Modal'

const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : '')

export default function QuotationEditModal({ quotation, onClose, onSaved }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    client_id: quotation.client ?? '',
    planner_id: quotation.planner ?? '',
    event_name: quotation.event_name ?? '',
    event_type: quotation.event_type ?? '',
    venue: quotation.venue ?? '',
    date_start: toLocalInput(quotation.date_start),
    date_end: toLocalInput(quotation.date_end),
    classification: quotation.classification ?? 'middle',
    valid_until: quotation.valid_until ?? '',
    notes: quotation.notes ?? '',
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
      await api.patch(`/quotations/${quotation.id}/`, {
        client: form.client_id,
        planner: form.planner_id,
        event_name: form.event_name,
        event_type: form.event_type,
        venue: form.venue,
        date_start: form.date_start,
        date_end: form.date_end,
        classification: form.classification,
        valid_until: form.valid_until || null,
        notes: form.notes,
      })
      onSaved()
    } catch {
      setError('Could not save these changes. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit Quotation" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <Field label="Client">
          <select required className="input" value={form.client_id} onChange={set('client_id')}>
            <option value="">Select a client…</option>
            {clients.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </Field>
        <Field label="Planner">
          <select required className="input" value={form.planner_id} onChange={set('planner_id')}>
            <option value="">Select a planner…</option>
            {planners.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </Field>
        <Field label="Event name">
          <input required className="input" value={form.event_name} onChange={set('event_name')} />
        </Field>
        <Field label="Event type">
          <input required className="input" value={form.event_type} onChange={set('event_type')} />
        </Field>
        <Field label="Venue">
          <input required className="input" value={form.venue} onChange={set('venue')} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Field label="Valid until (optional)">
          <input type="date" className="input" value={form.valid_until} onChange={set('valid_until')} />
        </Field>
        <Field label="Notes (optional)">
          <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save changes'}
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
