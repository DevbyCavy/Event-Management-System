import { useEffect, useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const CATEGORIES = ['equipment', 'food', 'transport', 'site_purchase', 'other']
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque']

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-700',
  processed: 'bg-green-100 text-green-800',
}

const EMPTY_REQUISITION = { event: '', category: 'other', description: '', amount_estimate: '' }

export default function RequisitionsListPage() {
  const { hasRole } = useAuth()
  const isAccountsOrAdmin = hasRole(roles.ADMIN, roles.ACCOUNTS)
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [requisitions, setRequisitions] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [processingId, setProcessingId] = useState(null)

  const load = () => {
    Promise.all([api.get('/requisitions/'), api.get('/events/')])
      .then(([reqRes, eventRes]) => {
        setRequisitions(reqRes.data.results ?? reqRes.data)
        setEvents(eventRes.data.results ?? eventRes.data)
      })
      .catch(() => setError('Could not load requisitions.'))
  }

  useEffect(load, [])

  const eventName = (id) => events.find((e) => e.id === id)?.name ?? `Event #${id}`

  const runAction = async (req, action) => {
    setBusyId(req.id)
    setActionError('')
    try {
      await api.post(`/requisitions/${req.id}/${action}/`)
      load()
    } catch {
      setActionError('Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!requisitions) return <SkeletonTable />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Requisitions</h1>
        {isPlannerOrAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New Requisition
          </button>
        )}
      </div>
      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Description</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Amount</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requisitions.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{eventName(req.event)}</td>
                <td className="px-4 py-2 text-gray-700 capitalize">{req.category.replace('_', ' ')}</td>
                <td className="px-4 py-2 text-gray-700">{req.description}</td>
                <td className="px-4 py-2 text-right text-gray-700">{req.amount_estimate}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={req.status} styles={STATUS_STYLES} />
                </td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  {isAccountsOrAdmin && req.status === 'pending' && (
                    <>
                      <button
                        disabled={busyId === req.id}
                        onClick={() => runAction(req, 'approve')}
                        className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === req.id}
                        onClick={() => runAction(req, 'reject')}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {isAccountsOrAdmin && req.status === 'approved' && (
                    <button
                      onClick={() => setProcessingId(req.id)}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      Process
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requisitions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No requisitions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateRequisitionModal
          events={events}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
      {processingId && (
        <ProcessModal
          requisitionId={processingId}
          onClose={() => setProcessingId(null)}
          onProcessed={() => { setProcessingId(null); load() }}
        />
      )}
    </div>
  )
}

function CreateRequisitionModal({ events, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_REQUISITION)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/requisitions/', form)
      onCreated()
    } catch {
      setError('Could not create this requisition.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="New Requisition" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Category</span>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Description</span>
          <textarea required className="input" rows={2} value={form.description} onChange={set('description')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Amount estimate</span>
          <input required type="number" step="0.01" min="0" className="input" value={form.amount_estimate} onChange={set('amount_estimate')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Requisition'}
        </button>
      </form>
    </Modal>
  )
}

function ProcessModal({ requisitionId, onClose, onProcessed }) {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/requisitions/${requisitionId}/process/`, { payment_method: paymentMethod })
      onProcessed()
    } catch {
      setError('Could not process this requisition.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Process Requisition" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Payment method</span>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m.replace('_', ' ')}</option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Processing…' : 'Process'}
        </button>
      </form>
    </Modal>
  )
}
