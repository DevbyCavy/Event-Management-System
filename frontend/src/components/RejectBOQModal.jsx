import { useState } from 'react'
import api from '../api/client'
import Modal from './Modal'

export default function RejectBOQModal({ boq, eventName, onClose, onRejected }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('A reason is required to reject a BOQ.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/boqs/${boq.id}/reject/`, { reason: reason.trim() })
      onRejected()
    } catch {
      setError('Could not reject this BOQ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Reject BOQ" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-gray-600">
          Rejecting the BOQ for <span className="font-medium text-gray-900">"{eventName}"</span>. The reason below
          will be shown to whoever created it so they can adjust it and resubmit.
        </p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Reason for rejection</span>
          <textarea
            required
            autoFocus
            className="input"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Quantities look too high for this venue, please double-check."
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? 'Rejecting…' : 'Reject BOQ'}
        </button>
      </form>
    </Modal>
  )
}
