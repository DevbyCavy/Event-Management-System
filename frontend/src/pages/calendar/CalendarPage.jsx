import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { SkeletonBlock } from '../../components/Skeleton'

const TYPE_META = {
  task: { label: 'Tasks', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-800 border-blue-500' },
  team_assignment: { label: 'Team Assignments', dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-800 border-purple-500' },
  vehicle_dispatch: { label: 'Vehicle Dispatch', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 border-emerald-500' },
  vehicle_return: { label: 'Vehicle Return', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 border-amber-500' },
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday
  const start = new Date(year, month, 1 - firstWeekday)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export default function CalendarPage() {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState('')
  const [enabledTypes, setEnabledTypes] = useState(new Set(Object.keys(TYPE_META)))
  const [showCreate, setShowCreate] = useState(false)

  const days = useMemo(() => getMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const load = () => {
    const start = dateKey(days[0])
    const end = dateKey(days[days.length - 1])
    api.get(`/calendar/?start=${start}&end=${end}`)
      .then((res) => setEntries(res.data))
      .catch(() => setError('Could not load the calendar.'))
  }

  useEffect(load, [days])

  const toggleType = (type) => {
    const next = new Set(enabledTypes)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    setEnabledTypes(next)
  }

  if (error) return <p className="text-red-600">{error}</p>

  const entriesByDate = {}
  ;(entries ?? []).forEach((e) => {
    if (!enabledTypes.has(e.type)) return
    entriesByDate[e.date] = entriesByDate[e.date] || []
    entriesByDate[e.date].push(e)
  })

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  const todayKey = dateKey(today)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Office Task Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} aria-label="Previous month" className="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="w-36 text-center text-sm font-bold text-gray-900">{monthLabel}</span>
          <button onClick={goNext} aria-label="Next month" className="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Calendars</h2>
            <div className="space-y-2">
              {Object.entries(TYPE_META).map(([type, meta]) => (
                <label key={type} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={enabledTypes.has(type)} onChange={() => toggleType(type)} />
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                  {meta.label}
                </label>
              ))}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700"
            >
              <Plus size={15} />
              New Task
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-xs font-medium text-gray-500">{w}</div>
            ))}
          </div>
          {!entries ? (
            <div className="grid grid-cols-7">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-24 border-b border-r border-gray-100 p-2">
                  <SkeletonBlock className="h-3 w-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const key = dateKey(d)
                const inMonth = d.getMonth() === cursor.getMonth()
                const isToday = key === todayKey
                const dayEntries = entriesByDate[key] ?? []
                return (
                  <div key={i} className="min-h-[6rem] border-b border-r border-gray-100 p-1.5 last:border-r-0">
                    <div className="mb-1 flex justify-end">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          isToday ? 'bg-brand-600 font-bold text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEntries.slice(0, 3).map((e, idx) => {
                        const meta = TYPE_META[e.type] ?? TYPE_META.task
                        return (
                          <div key={idx} title={e.title} className={`truncate rounded border-l-2 px-1.5 py-0.5 text-[11px] font-medium ${meta.chip}`}>
                            {e.title}
                          </div>
                        )
                      })}
                      {dayEntries.length > 3 && (
                        <div className="px-1.5 text-[10px] text-gray-400">+{dayEntries.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
    </div>
  )
}

function CreateTaskModal({ onClose, onCreated }) {
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ event: '', title: '', due_date: '', owner: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/events/'), api.get('/users/')]).then(([eRes, uRes]) => {
      setEvents(eRes.data.results ?? eRes.data)
      setUsers(uRes.data.results ?? uRes.data)
    }).catch(() => {})
  }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/tasks/', form)
      onCreated()
    } catch {
      setError('Could not create this task.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="New Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Event</span>
          <select required className="input" value={form.event} onChange={set('event')}>
            <option value="">Select an event…</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Title</span>
          <input required className="input" value={form.title} onChange={set('title')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Due date</span>
          <input required type="date" className="input" value={form.due_date} onChange={set('due_date')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Owner</span>
          <select required className="input" value={form.owner} onChange={set('owner')}>
            <option value="">Select an owner…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Task'}
        </button>
      </form>
    </Modal>
  )
}
