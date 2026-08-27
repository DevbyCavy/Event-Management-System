import { useEffect, useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'
import RadialProgress from '../../components/RadialProgress'

const PAYMENT_TYPES = ['deposit', 'balance', 'expense', 'refund']
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque']

export default function BudgetPage() {
  const { hasRole } = useAuth()
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)
  const isAccountsOrAdmin = hasRole(roles.ADMIN, roles.ACCOUNTS)

  const [budgetItems, setBudgetItems] = useState(null)
  const [payments, setPayments] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [showAddBudgetItem, setShowAddBudgetItem] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)

  const load = () => {
    Promise.all([api.get('/budget-items/'), api.get('/payments/'), api.get('/events/')])
      .then(([bRes, pRes, eRes]) => {
        setBudgetItems(bRes.data.results ?? bRes.data)
        setPayments(pRes.data.results ?? pRes.data)
        setEvents(eRes.data.results ?? eRes.data)
      })
      .catch(() => setError('Could not load budget data.'))
  }

  useEffect(load, [])

  const eventName = (id) => events.find((e) => e.id === id)?.name ?? `Event #${id}`

  if (error) return <p className="text-red-600">{error}</p>
  if (!budgetItems || !payments) return <SkeletonTable />

  const plannedTotal = budgetItems.reduce((sum, b) => sum + Number(b.planned_amount), 0)
  const actualTotal = budgetItems.reduce((sum, b) => sum + Number(b.actual_amount), 0)
  const spentPct = plannedTotal > 0 ? Math.round((actualTotal / plannedTotal) * 100) : 0

  return (
    <div className="space-y-8">
      {budgetItems.length > 0 && (
        <section className="flex flex-wrap items-center gap-8 rounded-xl border border-gray-200 bg-white p-6">
          <RadialProgress value={spentPct} label="of budget spent" color="#084b9a" />
          <div className="space-y-2 text-sm">
            <p className="text-gray-500">Planned total <span className="ml-2 font-semibold text-gray-900">{plannedTotal.toFixed(2)}</span></p>
            <p className="text-gray-500">Actual total <span className="ml-2 font-semibold text-gray-900">{actualTotal.toFixed(2)}</span></p>
          </div>
        </section>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Budget Items</h1>
          {isPlannerOrAdmin && (
            <button
              onClick={() => setShowAddBudgetItem(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add Budget Item
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Planned</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgetItems.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{eventName(b.event)}</td>
                  <td className="px-4 py-2 text-gray-700">{b.category}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{b.planned_amount}</td>
                  <td className={`px-4 py-2 text-right ${Number(b.actual_amount) > Number(b.planned_amount) ? 'font-semibold text-red-600' : 'text-gray-700'}`}>
                    {b.actual_amount}
                  </td>
                </tr>
              ))}
              {budgetItems.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No budget items yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          {isAccountsOrAdmin && (
            <button
              onClick={() => setShowAddPayment(true)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Record Payment
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">Amount</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Method</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{eventName(p.event)}</td>
                  <td className="px-4 py-2 text-gray-700 capitalize">{p.type}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{p.amount}</td>
                  <td className="px-4 py-2 text-gray-700">{p.method.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-gray-700">{p.date}</td>
                  <td className="px-4 py-2 text-gray-500">{p.reference || '—'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddBudgetItem && (
        <AddBudgetItemModal events={events} onClose={() => setShowAddBudgetItem(false)} onCreated={() => { setShowAddBudgetItem(false); load() }} />
      )}
      {showAddPayment && (
        <AddPaymentModal events={events} onClose={() => setShowAddPayment(false)} onCreated={() => { setShowAddPayment(false); load() }} />
      )}
    </div>
  )
}

function AddBudgetItemModal({ events, onClose, onCreated }) {
  const [form, setForm] = useState({ event: '', category: '', planned_amount: '', actual_amount: '0' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/budget-items/', form)
      onCreated()
    } catch {
      setError('Could not add this budget item.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Budget Item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Category</span>
          <input required className="input" value={form.category} onChange={set('category')} placeholder="e.g. Catering, Venue" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Planned amount</span>
          <input required type="number" step="0.01" min="0" className="input" value={form.planned_amount} onChange={set('planned_amount')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add Budget Item'}
        </button>
      </form>
    </Modal>
  )
}

function AddPaymentModal({ events, onClose, onCreated }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    event: '', type: 'deposit', amount: '', date: today, method: 'bank_transfer', reference: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/payments/', form)
      onCreated()
    } catch {
      setError('Could not record this payment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Type</span>
            <select className="input" value={form.type} onChange={set('type')}>
              {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Method</span>
            <select className="input" value={form.method} onChange={set('method')}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Amount</span>
          <input required type="number" step="0.01" min="0" className="input" value={form.amount} onChange={set('amount')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Date</span>
          <input required type="date" className="input" value={form.date} onChange={set('date')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Reference</span>
          <input className="input" value={form.reference} onChange={set('reference')} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Recording…' : 'Record Payment'}
        </button>
      </form>
    </Modal>
  )
}
