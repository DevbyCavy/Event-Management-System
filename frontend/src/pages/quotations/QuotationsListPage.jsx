import { useEffect, useState } from 'react'
import { ClipboardPlus, Eye, FileDown, Pencil, Trash2 } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import ConfirmModal from '../../components/ConfirmModal'
import CreateQuotationModal from '../../components/CreateQuotationModal'
import QuotationDetailModal from '../../components/QuotationDetailModal'
import QuotationEditModal from '../../components/QuotationEditModal'
import { downloadFile } from '../../lib/download'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
]

export default function QuotationsListPage() {
  const { user, hasRole } = useAuth()
  const [quotations, setQuotations] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [downloadingId, setDownloadingId] = useState(null)

  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const load = () => {
    api
      .get('/quotations/')
      .then((res) => setQuotations(res.data.results ?? res.data))
      .catch(() => setError('Could not load quotations.'))
  }

  useEffect(load, [])
  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data.results ?? res.data)).catch(() => {})
  }, [])

  const userName = (id) => users.find((u) => u.id === id)?.username ?? '—'
  const isEditable = (quotation) => quotation.status === 'draft' || quotation.status === 'rejected'

  const handleDownload = async (quotation) => {
    setDownloadingId(quotation.id)
    setActionError('')
    try {
      await downloadFile(`/quotations/${quotation.id}/pdf/`, `quotation-${quotation.id}.pdf`)
    } catch {
      setActionError('Could not download this quotation as a PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  const deleteQuotation = async () => {
    const quotation = confirmTarget
    setBusyId(quotation.id)
    setActionError('')
    try {
      await api.delete(`/quotations/${quotation.id}/`)
      setConfirmTarget(null)
      load()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not delete this quotation.')
      setConfirmTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!quotations) return <SkeletonTable />

  const visibleQuotations = statusFilter === 'all' ? quotations : quotations.filter((q) => q.status === statusFilter)
  const detailQuotation = quotations.find((q) => q.id === detailId)
  const editQuotation = quotations.find((q) => q.id === editId)

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors duration-150 ${
                statusFilter === f.key
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Client</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Valid Until</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleQuotations.map((quotation) => (
              <tr key={quotation.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">{quotation.event_name}</td>
                <td className="px-4 py-2 text-gray-700">{userName(quotation.client)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={quotation.status} styles={STATUS_STYLES} />
                </td>
                <td className="px-4 py-2 text-right text-gray-700">{Number(quotation.total).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-700">{quotation.valid_until || '—'}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDetailId(quotation.id)}
                      title="View quotation"
                      aria-label="View quotation"
                      className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(quotation)}
                      disabled={downloadingId === quotation.id}
                      title="Download PDF"
                      aria-label="Download PDF"
                      className="text-gray-400 transition-colors duration-150 hover:text-brand-700 disabled:opacity-50"
                    >
                      <FileDown size={16} />
                    </button>
                    {isPlannerOrAdmin && isEditable(quotation) && (
                      <button
                        onClick={() => setEditId(quotation.id)}
                        title="Edit quotation"
                        aria-label="Edit quotation"
                        className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isPlannerOrAdmin && isEditable(quotation) && (
                      <button
                        onClick={() => setConfirmTarget(quotation)}
                        disabled={busyId === quotation.id}
                        title="Delete quotation"
                        aria-label="Delete quotation"
                        className="text-gray-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleQuotations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No quotations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isPlannerOrAdmin && (
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Create Quotation"
          title="Create Quotation"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <ClipboardPlus size={24} />
        </button>
      )}

      {detailQuotation && (
        <QuotationDetailModal
          quotation={detailQuotation}
          users={users}
          canManage={isPlannerOrAdmin}
          canRespond={isPlannerOrAdmin || detailQuotation.client === user?.id}
          onClose={() => setDetailId(null)}
          onChanged={() => { setDetailId(null); load() }}
        />
      )}
      {showCreate && (
        <CreateQuotationModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
      {editQuotation && (
        <QuotationEditModal
          quotation={editQuotation}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); load() }}
        />
      )}
      {confirmTarget && (
        <ConfirmModal
          title="Delete Quotation"
          message={`Delete the quotation for "${confirmTarget.event_name}"? This cannot be undone.`}
          confirmLabel="Delete"
          busy={busyId === confirmTarget.id}
          onConfirm={deleteQuotation}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}
