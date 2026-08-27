import { useEffect, useState } from 'react'
import { Send, X } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Modal from './Modal'

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: '' }

export default function CreateQuotationModal({ inquiry, onClose, onCreated }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [selectedInquiryId, setSelectedInquiryId] = useState(inquiry?.id ?? '')
  const [form, setForm] = useState({
    planner_id: user?.id ?? '',
    client_id: '',
    event_name: inquiry?.event_type ?? '',
    event_type: inquiry?.event_type ?? '',
    venue: '',
    date_start: '',
    date_end: '',
    classification: 'middle',
    valid_until: '',
    notes: '',
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data.results ?? res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (inquiry) return
    api.get('/inquiries/').then((res) => {
      const list = res.data.results ?? res.data
      setInquiries(list.filter((i) => i.status === 'new'))
    }).catch(() => {})
  }, [inquiry])

  const clients = users.filter((u) => u.groups.includes('Client'))
  const planners = users.filter((u) => u.groups.includes('Event Planner') || u.is_superuser)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const selectInquiry = (e) => {
    const id = e.target.value
    setSelectedInquiryId(id)
    const picked = inquiries.find((i) => String(i.id) === id)
    if (picked) setForm({ ...form, event_name: picked.event_type, event_type: picked.event_type })
  }

  const setItem = (index, field) => (e) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: e.target.value }
    setItems(next)
  }

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  const amountFor = (item) => (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  const total = items.reduce((sum, i) => sum + amountFor(i), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const quotationRes = await api.post('/quotations/', {
        inquiry: inquiry?.id ?? selectedInquiryId,
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
      const quotationId = quotationRes.data.id

      for (const item of items) {
        if (!item.description || !item.unit_price) continue
        await api.post('/quotation-items/', {
          quotation: quotationId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })
      }

      onCreated()
    } catch {
      setError('Could not create this quotation. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Create Quotation" onClose={onClose} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
        {!inquiry && (
          <Field label="Inquiry">
            <select required className="input" value={selectedInquiryId} onChange={selectInquiry}>
              <option value="">Select an inquiry…</option>
              {inquiries.map((i) => (
                <option key={i.id} value={i.id}>{i.client_name} — {i.event_type}</option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Field label="Classification">
            <select className="input" value={form.classification} onChange={set('classification')}>
              <option value="high">High</option>
              <option value="middle">Middle</option>
              <option value="low">Low</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Event name">
            <input required className="input" value={form.event_name} onChange={set('event_name')} placeholder="e.g. July Worship Festival" />
          </Field>
          <Field label="Event type">
            <input required className="input" value={form.event_type} onChange={set('event_type')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Venue">
            <input required className="input" value={form.venue} onChange={set('venue')} />
          </Field>
          <Field label="Valid until (optional)">
            <input type="date" className="input" value={form.valid_until} onChange={set('valid_until')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Starts">
            <input required type="datetime-local" className="input" value={form.date_start} onChange={set('date_start')} />
          </Field>
          <Field label="Ends">
            <input required type="datetime-local" className="input" value={form.date_end} onChange={set('date_end')} />
          </Field>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-900">Items</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-gray-700">Description</th>
                  <th className="w-20 px-3 py-2 text-left font-bold text-gray-700">Quantity</th>
                  <th className="w-28 px-3 py-2 text-left font-bold text-gray-700">Unit Price</th>
                  <th className="w-28 px-3 py-2 text-right font-bold text-gray-700">Amount</th>
                  <th className="w-8 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="p-2">
                      <input
                        className="input"
                        value={item.description}
                        onChange={setItem(i, 'description')}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        className="input"
                        value={item.quantity}
                        onChange={setItem(i, 'quantity')}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={item.unit_price}
                        onChange={setItem(i, 'unit_price')}
                      />
                    </td>
                    <td className="p-2 text-right font-medium text-gray-900">{amountFor(item).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                        aria-label="Remove item"
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-gray-900">TOTAL</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{total.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50"
          >
            + Add Item
          </button>
        </div>

        <Field label="Notes (optional)">
          <textarea className="input" rows={4} value={form.notes} onChange={set('notes')} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
        >
          <Send size={16} />
          {submitting ? 'Creating…' : 'Create Quotation'}
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
