import { useEffect, useState } from 'react'
import api from '../api/client'
import Modal from './Modal'

export default function ReturnsChecklistModal({ eventId, eventName, onClose, onDone }) {
  const [stockOuts, setStockOuts] = useState(null)
  const [checked, setChecked] = useState({})
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .get('/stock-out/')
      .then((res) => {
        const rows = (res.data.results ?? res.data).filter((so) => so.product_returnable && so.event === eventId)
        setStockOuts(rows)
        setChecked(Object.fromEntries(rows.map((so) => [so.id, so.returned || !so.missing_reported_at])))
      })
      .catch(() => setLoadError('Could not load returnable items for this job.'))
  }, [eventId])

  const toggle = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      await Promise.all(
        stockOuts
          .filter((so) => !so.returned)
          .map((so) =>
            checked[so.id]
              ? api.post(`/stock-out/${so.id}/mark-returned/`)
              : api.post(`/stock-out/${so.id}/report-missing/`)
          )
      )
      onDone()
    } catch {
      setSubmitError('Could not save the returns checklist.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Returns Checklist — ${eventName}`} onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">
        Tick off every returnable item you can confirm is back. Anything left unchecked will be flagged missing —
        you can write up the details afterward on the Returns Report page.
      </p>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loadError && !stockOuts && <p className="text-sm text-gray-500">Loading…</p>}

      {stockOuts && stockOuts.length === 0 && (
        <p className="text-sm text-gray-500">No returnable items were issued for this job.</p>
      )}

      {stockOuts && stockOuts.length > 0 && (
        <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-gray-200">
          {stockOuts.map((so) => (
            <label
              key={so.id}
              className={`flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 ${
                so.returned ? 'bg-gray-50' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!checked[so.id]}
                  disabled={so.returned}
                  onChange={() => toggle(so.id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="font-medium text-gray-900">{so.product_name}</span>
                <span className="text-gray-500">x{so.quantity}</span>
              </span>
              {so.returned && <span className="text-xs font-medium text-green-700">Already returned</span>}
            </label>
          ))}
        </div>
      )}

      {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}

      {stockOuts && stockOuts.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Confirm & Sign Off'}
        </button>
      )}
    </Modal>
  )
}
