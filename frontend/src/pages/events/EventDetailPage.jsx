import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, Send } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import StatusTimeline from '../../components/StatusTimeline'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'

const EMPTY_RETURN_SHEET = { dismantle_date: '', items_returned: '', damages_notes: '' }

function formatReturnItem(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  if (item && typeof item === 'object') {
    if ('quantity' in item || 'product' in item) {
      return `${item.quantity ?? '?'} x ${item.product_name ?? `Product #${item.product}`}`
    }
    return JSON.stringify(item)
  }
  return String(item)
}

export default function EventDetailPage() {
  const { id } = useParams()
  const { user, hasRole } = useAuth()
  const toast = useToast()
  const [event, setEvent] = useState(null)
  const [order, setOrder] = useState(null)
  const [budget, setBudget] = useState(null)
  const [hasBoq, setHasBoq] = useState(false)
  const [hasStaffing, setHasStaffing] = useState(false)
  const [teamAssignments, setTeamAssignments] = useState([])
  const [teams, setTeams] = useState([])
  const [comments, setComments] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [returnSheet, setReturnSheet] = useState(null)
  const [returnSheetLoaded, setReturnSheetLoaded] = useState(false)
  const [returnSheetForm, setReturnSheetForm] = useState(EMPTY_RETURN_SHEET)
  const [savingReturnSheet, setSavingReturnSheet] = useState(false)
  const [returnSheetError, setReturnSheetError] = useState('')
  const [signingOff, setSigningOff] = useState(false)
  const [completionBusy, setCompletionBusy] = useState(false)
  const [completionError, setCompletionError] = useState('')
  const [error, setError] = useState('')
  const [savingClassification, setSavingClassification] = useState(false)

  const isAdmin = hasRole(roles.ADMIN)
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const loadEvent = () => {
    api
      .get(`/events/${id}/`)
      .then((res) => setEvent(res.data))
      .catch(() => setError('Could not load this event.'))
  }

  const loadComments = () => {
    api
      .get('/event-comments/')
      .then((res) => {
        const list = (res.data.results ?? res.data).filter((c) => String(c.event) === id)
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setComments(list)
      })
      .catch(() => {})
  }

  const loadReturnSheet = () => {
    api
      .get('/return-sheets/')
      .then((res) => {
        const list = res.data.results ?? res.data
        setReturnSheet(list.find((rs) => String(rs.event) === id) ?? null)
        setReturnSheetLoaded(true)
      })
      .catch(() => setReturnSheetLoaded(true))
  }

  useEffect(() => {
    loadEvent()
    loadComments()
    loadReturnSheet()

    api
      .get('/event-team-assignments/')
      .then((res) => {
        const assignments = (res.data.results ?? res.data).filter((a) => String(a.event) === id)
        setTeamAssignments(assignments)
        setHasStaffing(assignments.length > 0)
      })
      .catch(() => {})

    api.get('/teams/').then((res) => setTeams(res.data.results ?? res.data)).catch(() => {})

    api
      .get('/orders/')
      .then((res) => {
        const orders = res.data.results ?? res.data
        const found = orders.find((o) => String(o.event) === id) ?? null
        setOrder(found)
        if (found && isPlannerOrAdmin) {
          api.get('/boqs/').then((bRes) => {
            const boqs = bRes.data.results ?? bRes.data
            setHasBoq(boqs.some((b) => b.event === found.id))
          }).catch(() => {})
        }
      })
      .catch(() => {})

    if (isPlannerOrAdmin) {
      api
        .get(`/budget-items/totals/?event=${id}`)
        .then((res) => setBudget(res.data))
        .catch(() => {})
    }
  }, [id, isPlannerOrAdmin])

  const isTeamLeader = teamAssignments.some((a) => {
    const team = teams.find((t) => t.id === a.team)
    return team && user?.staff_id && team.leader === user.staff_id
  })
  const canManageReturnSheet = isPlannerOrAdmin || isTeamLeader

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setPostingComment(true)
    setCommentError('')
    try {
      await api.post('/event-comments/', { event: id, comment: newComment.trim() })
      setNewComment('')
      loadComments()
    } catch {
      setCommentError('Could not post this comment.')
    } finally {
      setPostingComment(false)
    }
  }

  const handleCreateReturnSheet = async (e) => {
    e.preventDefault()
    setSavingReturnSheet(true)
    setReturnSheetError('')
    try {
      const items = returnSheetForm.items_returned
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      await api.post('/return-sheets/', {
        event: id,
        dismantle_date: returnSheetForm.dismantle_date,
        items_returned: items,
        damages_notes: returnSheetForm.damages_notes,
      })
      setReturnSheetForm(EMPTY_RETURN_SHEET)
      loadReturnSheet()
      toast.success('Return sheet created.')
    } catch {
      setReturnSheetError('Could not save this return sheet.')
    } finally {
      setSavingReturnSheet(false)
    }
  }

  const handleSignOff = async () => {
    setSigningOff(true)
    setReturnSheetError('')
    try {
      const res = await api.post(`/return-sheets/${returnSheet.id}/sign-off/`)
      setReturnSheet(res.data)
      toast.success('Return sheet signed off.')
    } catch {
      setReturnSheetError('Could not sign off this return sheet.')
    } finally {
      setSigningOff(false)
    }
  }

  const handleMarkProcessed = async () => {
    setCompletionBusy(true)
    setCompletionError('')
    try {
      const res = await api.post(`/events/${id}/mark-processed/`)
      setEvent(res.data)
      toast.success('Event marked processed.')
    } catch (err) {
      setCompletionError(
        Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not mark this event processed.'
      )
    } finally {
      setCompletionBusy(false)
    }
  }

  const handleMarkDone = async () => {
    setCompletionBusy(true)
    setCompletionError('')
    try {
      const res = await api.post(`/events/${id}/mark-done/`)
      setEvent(res.data)
      toast.success('Event marked done.')
    } catch (err) {
      setCompletionError(
        Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not mark this event done.'
      )
    } finally {
      setCompletionBusy(false)
    }
  }

  const handleClassificationChange = async (e) => {
    const classification = e.target.value
    setSavingClassification(true)
    try {
      const res = await api.patch(`/events/${id}/`, { classification })
      setEvent(res.data)
      toast.success('Classification updated.')
    } catch {
      setError('Could not update classification.')
      toast.error('Could not update classification.')
    } finally {
      setSavingClassification(false)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!event) return <SkeletonCard />

  let currentIndex = 1
  if (order?.order_status === 'approved') currentIndex = 2
  if (hasBoq) currentIndex = 3
  if (hasStaffing) currentIndex = 4
  if (event.event_status === 'processed') currentIndex = 5
  if (event.event_status === 'done') currentIndex = 6

  return (
    <div className="max-w-4xl">
      <Link to="/events" className="text-sm text-brand-700 hover:underline">
        ← Back to events
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-gray-900">{event.name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Stage</h2>
          <StatusTimeline currentIndex={currentIndex} />
        </section>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Event</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Type" value={event.type} />
              <Row label="Venue" value={event.venue} />
              <Row label="Starts" value={new Date(event.date_start).toLocaleString()} />
              <Row label="Ends" value={new Date(event.date_end).toLocaleString()} />
              <Row label="Status" value={event.event_status} />
              <div className="flex items-center justify-between py-1">
                <dt className="text-gray-500">Classification</dt>
                <dd>
                  {isAdmin ? (
                    <select
                      value={event.classification}
                      onChange={handleClassificationChange}
                      disabled={savingClassification}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm transition-colors duration-150 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="middle">Middle</option>
                      <option value="low">Low</option>
                    </select>
                  ) : (
                    <span className="capitalize">{event.classification}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Order</h2>
            {order ? (
              <dl className="space-y-2 text-sm">
                <Row label="Status" value={order.order_status} />
                <Row label="Signed at" value={order.signed_at ? new Date(order.signed_at).toLocaleString() : '—'} />
                <Row label="Approved at" value={order.approved_at ? new Date(order.approved_at).toLocaleString() : '—'} />
              </dl>
            ) : (
              <p className="text-sm text-gray-500">No order found for this event.</p>
            )}
          </section>

          {budget && (
            <section className="col-span-1 rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Budget Summary</h2>
              <dl className="grid grid-cols-3 gap-4 text-sm">
                <Row label="Planned" value={budget.planned_total} />
                <Row label="Actual" value={budget.actual_total} />
                <Row label="Variance" value={budget.variance} />
              </dl>
            </section>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Return / Dismantling Sheet</h2>
          {isPlannerOrAdmin && event.event_status !== 'done' && (
            <div className="flex items-center gap-2">
              {event.event_status === 'pending' && (
                <button
                  onClick={handleMarkProcessed}
                  disabled={completionBusy || !returnSheet?.signed_off_by}
                  title={!returnSheet?.signed_off_by ? 'The return sheet must be signed off first' : undefined}
                  className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-50"
                >
                  <ClipboardCheck size={14} />
                  Mark Processed
                </button>
              )}
              {event.event_status === 'processed' && (
                <button
                  onClick={handleMarkDone}
                  disabled={completionBusy}
                  className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  Mark Done
                </button>
              )}
            </div>
          )}
        </div>
        {completionError && <p className="mb-3 text-sm text-red-600">{completionError}</p>}
        {returnSheetError && <p className="mb-3 text-sm text-red-600">{returnSheetError}</p>}

        {!returnSheetLoaded && <p className="text-sm text-gray-500">Loading…</p>}

        {returnSheetLoaded && returnSheet && (
          <dl className="space-y-2 text-sm">
            <Row label="Dismantled by" value={returnSheet.dismantled_by_username} />
            <Row label="Dismantle date" value={returnSheet.dismantle_date} />
            <Row
              label="Items returned"
              value={
                returnSheet.items_returned?.length
                  ? returnSheet.items_returned.map(formatReturnItem).join(', ')
                  : '—'
              }
            />
            <Row label="Damage notes" value={returnSheet.damages_notes || '—'} />
            <div className="flex items-center justify-between py-1">
              <dt className="text-gray-500">Signed off</dt>
              <dd className="flex items-center gap-2">
                {returnSheet.signed_off_by ? (
                  <span className="text-gray-900">{returnSheet.signed_off_by_username}</span>
                ) : canManageReturnSheet ? (
                  <button
                    onClick={handleSignOff}
                    disabled={signingOff}
                    className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-50"
                  >
                    {signingOff ? 'Signing…' : 'Sign Off'}
                  </button>
                ) : (
                  <span className="text-gray-400">Not yet signed off</span>
                )}
              </dd>
            </div>
          </dl>
        )}

        {returnSheetLoaded && !returnSheet && !canManageReturnSheet && (
          <p className="text-sm text-gray-500">No return sheet has been created for this event yet.</p>
        )}

        {returnSheetLoaded && !returnSheet && canManageReturnSheet && (
          <form onSubmit={handleCreateReturnSheet} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Dismantle date</span>
              <input
                required
                type="date"
                className="input"
                value={returnSheetForm.dismantle_date}
                onChange={(e) => setReturnSheetForm({ ...returnSheetForm, dismantle_date: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Items returned (one per line)</span>
              <textarea
                className="input"
                rows={3}
                value={returnSheetForm.items_returned}
                onChange={(e) => setReturnSheetForm({ ...returnSheetForm, items_returned: e.target.value })}
                placeholder={'6 x Round Table\n50 x Chair'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Damage notes</span>
              <textarea
                className="input"
                rows={2}
                value={returnSheetForm.damages_notes}
                onChange={(e) => setReturnSheetForm({ ...returnSheetForm, damages_notes: e.target.value })}
                placeholder="Leave blank if nothing was damaged"
              />
            </label>
            <button
              type="submit"
              disabled={savingReturnSheet}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
            >
              {savingReturnSheet ? 'Saving…' : 'Create Return Sheet'}
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Comments</h2>
        <div className="mb-4 space-y-3">
          {comments === null && <p className="text-sm text-gray-500">Loading…</p>}
          {comments?.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
          {comments?.map((c) => (
            <div key={c.id} className="border-b border-gray-100 pb-2 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{c.author_username}</span>
                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-700">{c.comment}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handlePostComment} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Add a comment</span>
            <textarea
              className="input"
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
            />
          </label>
          <button
            type="submit"
            disabled={postingComment || !newComment.trim()}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
          >
            <Send size={14} />
            Post
          </button>
        </form>
        {commentError && <p className="mt-2 text-sm text-red-600">{commentError}</p>}
      </section>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}
