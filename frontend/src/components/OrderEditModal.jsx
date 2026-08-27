import { useState } from 'react'
import api from '../api/client'
import Modal from './Modal'

const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : '')

export default function OrderEditModal({ order, event, users, onClose, onSaved }) {
  const clients = users.filter((u) => u.groups.includes('Client'))
  const planners = users.filter((u) => u.groups.includes('Event Planner') || u.is_superuser)

  const [form, setForm] = useState({
    client_id: event?.client ?? '',
    planner_id: event?.planner ?? '',
    name: event?.name ?? '',
    type: event?.type ?? '',
    venue: event?.venue ?? '',
    date_start: toLocalInput(event?.date_start),
    date_end: toLocalInput(event?.date_end),
    classification: event?.classification ?? 'middle',
    deadline_datetime: toLocalInput(order.deadline_datetime),
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.patch(`/events/${order.event}/`, {
        name: form.name,
        type: form.type,
        client: form.client_id,
        planner: form.planner_id,
        date_start: form.date_start,
        date_end: form.date_end,
        venue: form.venue,
        classification: form.classification,
      })
      await api.patch(`/orders/${order.id}/`, {
        deadline_datetime: form.deadline_datetime || null,
      })
      onSaved()
    } catch {
      setError('Could not save these changes. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit Order" onClose={onClose}>
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
        <Field label="Deadline">
          <input type="datetime-local" className="input" value={form.deadline_datetime} onChange={set('deadline_datetime')} />
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
