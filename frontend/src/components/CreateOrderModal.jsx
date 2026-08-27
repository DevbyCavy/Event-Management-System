import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Modal from './Modal'

const EMPTY_ORDER_FORM = {
  client_id: '', planner_id: '', name: '', type: '', venue: '', date_start: '', date_end: '', classification: 'middle',
  team_name: '', leader_id: '', member_ids: [], call_time: '', role_on_site: '',
}

export default function CreateOrderModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [form, setForm] = useState({ ...EMPTY_ORDER_FORM, planner_id: user?.id ?? '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/users/'), api.get('/staff/')]).then(([uRes, sRes]) => {
      setUsers(uRes.data.results ?? uRes.data)
      setStaff(sRes.data.results ?? sRes.data)
    }).catch(() => {})
  }, [])

  const clients = users.filter((u) => u.groups.includes('Client'))
  const planners = users.filter((u) => u.groups.includes('Event Planner') || u.is_superuser)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const toggleMember = (staffId) => {
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(staffId)
        ? f.member_ids.filter((id) => id !== staffId)
        : [...f.member_ids, staffId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const eventRes = await api.post('/events/', {
        name: form.name,
        type: form.type,
        client: form.client_id,
        planner: form.planner_id,
        date_start: form.date_start,
        date_end: form.date_end,
        venue: form.venue,
        classification: form.classification,
      })
      const eventId = eventRes.data.id

      await api.post('/orders/', { event: eventId })

      const teamRes = await api.post('/teams/', { name: form.team_name, leader: form.leader_id })
      const teamId = teamRes.data.id

      for (const staffId of form.member_ids) {
        await api.post('/team-members/', { team: teamId, staff: staffId })
      }

      await api.post('/event-team-assignments/', {
        event: eventId, team: teamId, call_time: form.call_time, role_on_site: form.role_on_site,
      })

      onCreated()
    } catch {
      setError('Could not create this order. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Create Order" onClose={onClose}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Order details</h3>
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
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Team setup</h3>
          <Field label="Team name">
            <input required className="input" value={form.team_name} onChange={set('team_name')} placeholder="e.g. Rigging Crew" />
          </Field>
          <Field label="Team leader">
            <select required className="input" value={form.leader_id} onChange={set('leader_id')}>
              <option value="">Select a team leader…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
            </select>
          </Field>
          <Field label="Team members (drivers, production, etc.)">
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {staff.length === 0 && <p className="text-xs text-gray-400">No staff available.</p>}
              {staff.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.member_ids.includes(s.id)}
                    onChange={() => toggleMember(s.id)}
                  />
                  {s.name} — {s.role}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Call time">
            <input required type="datetime-local" className="input" value={form.call_time} onChange={set('call_time')} />
          </Field>
          <Field label="Role on site (optional)">
            <input className="input" value={form.role_on_site} onChange={set('role_on_site')} />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Order'}
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
