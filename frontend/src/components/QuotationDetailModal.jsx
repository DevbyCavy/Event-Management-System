import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import api from '../api/client'
import Modal from './Modal'
import StatusBadge from './StatusBadge'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: '' }

export default function QuotationDetailModal({ quotation, users, canManage, canRespond, onClose, onChanged }) {
  const [items, setItems] = useState(quotation.items)
  const [newItem, setNewItem] = useState({ ...EMPTY_ITEM })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const userName = (id) => users.find((u) => u.id === id)?.username ?? '—'
  const isDraft = quotation.status === 'draft'
  const isSent = quotation.status === 'sent'
  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)

  const addItem = async () => {
    if (!newItem.description || !newItem.unit_price) return
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/quotation-items/', {
        quotation: quotation.id,
        description: newItem.description,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
      })
      setItems([...items, res.data])
      setNewItem({ ...EMPTY_ITEM })
    } catch {
      setError('Could not add this item.')
    } finally {
      setBusy(false)
    }
  }

  const removeItem = async (itemId) => {
    setBusy(true)
    setError('')
    try {
      await api.delete(`/quotation-items/${itemId}/`)
      setItems(items.filter((i) => i.id !== itemId))
    } catch {
      setError('Could not remove this item.')
    } finally {
      setBusy(false)
    }
  }

  const runAction = async (action) => {
    setBusy(true)
    setError('')
    try {
      await api.post(`/quotations/${quotation.id}/${action}/`)
      onChanged()
    } catch (err) {
      setError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : `Could not ${action} this quotation.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Quotation Details" onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <Row label="Event">{quotation.event_name}</Row>
        <Row label="Type">{quotation.event_type}</Row>
        <Row label="Venue">{quotation.venue}</Row>
        <Row label="Client">{userName(quotation.client)}</Row>
        <Row label="Planner">{userName(quotation.planner)}</Row>
        <Row label="Status">
          <StatusBadge status={quotation.status} styles={STATUS_STYLES} />
        </Row>
        {quotation.valid_until && <Row label="Valid until">{quotation.valid_until}</Row>}
        {quotation.notes && <Row label="Notes">{quotation.notes}</Row>}

        <div className="border-t border-gray-100 pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Line items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th className="pb-1 font-medium">Description</th>
                <th className="pb-1 text-right font-medium">Qty</th>
                <th className="pb-1 text-right font-medium">Unit price</th>
                <th className="pb-1 text-right font-medium">Subtotal</th>
                {isDraft && canManage && <th className="pb-1" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 pr-2 text-gray-700">{item.description}</td>
                  <td className="py-1.5 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-1.5 text-right text-gray-700">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900">{Number(item.subtotal).toFixed(2)}</td>
                  {isDraft && canManage && (
                    <td className="py-1.5 text-right">
                      <button onClick={() => removeItem(item.id)} disabled={busy} className="text-gray-400 hover:text-red-600 disabled:opacity-50" aria-label="Remove item">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-gray-400">No line items yet.</td>
                </tr>
              )}
            </tbody>
          </table>

          {isDraft && canManage && (
            <div className="mt-2 flex items-end gap-2">
              <label className="block flex-1">
                <span className="mb-1 block text-xs font-medium text-gray-700">Description</span>
                <input className="input" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
              </label>
              <label className="block w-16">
                <span className="mb-1 block text-xs font-medium text-gray-700">Qty</span>
                <input type="number" min="1" className="input" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
              </label>
              <label className="block w-24">
                <span className="mb-1 block text-xs font-medium text-gray-700">Unit price</span>
                <input type="number" min="0" step="0.01" className="input" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
              </label>
              <button type="button" onClick={addItem} disabled={busy} className="mb-1 text-sm font-medium text-brand-700 hover:underline disabled:opacity-50">
                Add
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 font-medium text-gray-900">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          {isDraft && canManage && (
            <button
              onClick={() => runAction('send')}
              disabled={busy || items.length === 0}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Send to client
            </button>
          )}
          {isSent && canRespond && (
            <>
              <button
                onClick={() => runAction('reject')}
                disabled={busy}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                Reject
              </button>
              <button
                onClick={() => runAction('accept')}
                disabled={busy}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Accept
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}
