import { useEffect, useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'

const GATES = ['order_approval', 'boq_creation', 'requisition_processing']

export default function PoliciesPage() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole(roles.ADMIN)

  const [policies, setPolicies] = useState(null)
  const [approvals, setApprovals] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [approvingPolicy, setApprovingPolicy] = useState(null)

  const load = () => {
    Promise.all([api.get('/policies/'), api.get('/policy-approvals/'), api.get('/events/')])
      .then(([pRes, aRes, eRes]) => {
        setPolicies(pRes.data.results ?? pRes.data)
        setApprovals(aRes.data.results ?? aRes.data)
        setEvents(eRes.data.results ?? eRes.data)
      })
      .catch(() => setError('Could not load policies.'))
  }

  useEffect(load, [])

  const eventName = (id) => events.find((e) => e.id === id)?.name ?? `Event #${id}`
  const policyTitle = (id) => policies?.find((p) => p.id === id)?.title ?? `Policy #${id}`

  if (error) return <p className="text-red-600">{error}</p>
  if (!policies || !approvals) return <SkeletonTable />

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add Policy
            </button>
          )}
        </div>
        <div className="space-y-3">
          {policies.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{p.title}</span>
                  {p.requires_approval && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      requires approval · {p.approval_gate.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {isAdmin && p.requires_approval && (
                  <button
                    onClick={() => setApprovingPolicy(p)}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    Record Approval
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{p.content}</p>
              <p className="mt-1 text-xs text-gray-400">
                {[p.event_type && `event: ${p.event_type}`, p.classification && `classification: ${p.classification}`]
                  .filter(Boolean).join(' · ') || 'Applies to all events'}
              </p>
            </div>
          ))}
          {policies.length === 0 && <p className="text-gray-500">No policies yet.</p>}
        </div>
      </div>

      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Approval History</h1>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Policy</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Approved At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{policyTitle(a.policy)}</td>
                  <td className="px-4 py-2 text-gray-700">{eventName(a.event)}</td>
                  <td className="px-4 py-2 text-gray-700">{new Date(a.approved_at).toLocaleString()}</td>
                </tr>
              ))}
              {approvals.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No approvals recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddPolicyModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load() }} />
      )}
      {approvingPolicy && (
        <RecordApprovalModal
          policy={approvingPolicy}
          events={events}
          onClose={() => setApprovingPolicy(null)}
          onRecorded={() => { setApprovingPolicy(null); load() }}
        />
      )}
    </div>
  )
}

function AddPolicyModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', client_type: '', event_type: '', classification: '', content: '',
    requires_approval: false, approval_gate: '', approver_role: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [field]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/policies/', form)
      onCreated()
    } catch {
      setError('Could not create this policy.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Policy" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Title</span>
          <input required className="input" value={form.title} onChange={set('title')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Content</span>
          <textarea required className="input" rows={3} value={form.content} onChange={set('content')} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Event type (optional)</span>
            <input className="input" value={form.event_type} onChange={set('event_type')} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Classification (optional)</span>
            <select className="input" value={form.classification} onChange={set('classification')}>
              <option value="">Any</option>
              <option value="high">High</option>
              <option value="middle">Middle</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.requires_approval} onChange={set('requires_approval')} />
          Requires approval (hard gate)
        </label>
        {form.requires_approval && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Approval gate</span>
              <select required className="input" value={form.approval_gate} onChange={set('approval_gate')}>
                <option value="">Select a gate…</option>
                {GATES.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Approver role</span>
              <input className="input" value={form.approver_role} onChange={set('approver_role')} placeholder="e.g. Admin" />
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Add Policy'}
        </button>
      </form>
    </Modal>
  )
}

function RecordApprovalModal({ policy, events, onClose, onRecorded }) {
  const [eventId, setEventId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/policy-approvals/', { policy: policy.id, event: eventId })
      onRecorded()
    } catch {
      setError('Could not record this approval.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Record Approval — ${policy.title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Recording…' : 'Record Approval'}
        </button>
      </form>
    </Modal>
  )
}
