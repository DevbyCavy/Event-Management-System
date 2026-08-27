import { useEffect, useMemo, useState } from 'react'
import { FileEdit, PackageSearch, Search } from 'lucide-react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { SkeletonTable } from '../../components/Skeleton'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'

export default function ReturnsReportPage() {
  const { hasRole } = useAuth()
  const canWriteReports = hasRole(roles.ADMIN, roles.STOREKEEPER)

  const [stockOuts, setStockOuts] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [reportTarget, setReportTarget] = useState(null)

  const load = () => {
    api
      .get('/stock-out/')
      .then((res) => setStockOuts(res.data.results ?? res.data))
      .catch(() => setError('Could not load the returns report.'))
  }

  useEffect(load, [])

  const rows = useMemo(
    () => (stockOuts ?? []).filter((so) => so.missing_reported_at && !so.returned),
    [stockOuts]
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.product_name, r.event_name, r.taken_by_username].some((v) => v?.toLowerCase().includes(q))
    )
  }, [rows, search])

  if (error) return <p className="text-red-600">{error}</p>
  if (!stockOuts) return <SkeletonTable />

  const unwrittenCount = rows.filter((r) => !r.missing_notes).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns Report</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Items flagged missing on a job&apos;s returns checklist — {unwrittenCount} still need a written report.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search product, job, collector…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Flagged On</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Collector</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Product</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Qty Issued</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Job</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Report</th>
              {canWriteReports && <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">{new Date(r.missing_reported_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-gray-700">{r.taken_by_username}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{r.product_name}</td>
                <td className="px-4 py-2 text-right text-gray-700">{r.quantity}</td>
                <td className="px-4 py-2 text-gray-700">{r.event_name}</td>
                <td className="px-4 py-2 max-w-xs text-gray-700">
                  {r.missing_notes || <span className="italic text-gray-400">Not written yet</span>}
                </td>
                {canWriteReports && (
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setReportTarget(r)}
                      className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      <FileEdit size={14} />
                      {r.missing_notes ? 'Edit Report' : 'Write Report'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={canWriteReports ? 7 : 6} className="px-4 py-10 text-center text-gray-500">
                  <PackageSearch size={28} className="mx-auto mb-2 text-gray-300" />
                  No missing items reported.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {reportTarget && (
        <WriteReportModal
          stockOut={reportTarget}
          onClose={() => setReportTarget(null)}
          onSaved={(updated) => {
            setStockOuts((prev) => prev.map((so) => (so.id === updated.id ? updated : so)))
            setReportTarget(null)
          }}
        />
      )}
    </div>
  )
}

function WriteReportModal({ stockOut, onClose, onSaved }) {
  const [notes, setNotes] = useState(stockOut.missing_notes || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post(`/stock-out/${stockOut.id}/report-missing/`, { notes })
      onSaved(res.data)
    } catch {
      setError('Could not submit this report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Write Missing-Item Report" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-gray-600">
          {stockOut.quantity} x <span className="font-medium text-gray-900">{stockOut.product_name}</span> from{' '}
          <span className="font-medium text-gray-900">{stockOut.event_name}</span>
        </p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">What&apos;s missing or damaged?</span>
          <textarea
            required
            rows={4}
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 2 of 6 chairs not returned, 1 speaker damaged"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </Modal>
  )
}
