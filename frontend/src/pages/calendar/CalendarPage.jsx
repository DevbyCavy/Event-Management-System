import { useEffect, useState } from 'react'
import api from '../../api/client'
import { SkeletonTable } from '../../components/Skeleton'

const TYPE_STYLES = {
  task: 'bg-blue-100 text-blue-800',
  team_assignment: 'bg-brand-100 text-brand-800',
  vehicle_dispatch: 'bg-green-100 text-green-800',
  vehicle_return: 'bg-yellow-100 text-yellow-800',
}

export default function CalendarPage() {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const load = () => {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    api.get(`/calendar/?${params.toString()}`)
      .then((res) => setEntries(res.data))
      .catch(() => setError('Could not load the calendar.'))
  }

  useEffect(load, [start, end])

  if (error) return <p className="text-red-600">{error}</p>
  if (!entries) return <SkeletonTable />

  const grouped = entries.reduce((acc, entry) => {
    acc[entry.date] = acc[entry.date] || []
    acc[entry.date].push(entry)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            From <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="flex items-center gap-1">
            To <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dayEntries]) => (
          <div key={date} className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-2 font-bold text-gray-900">
              {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            <ul className="space-y-1">
              {dayEntries.map((entry, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[entry.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {entry.type.replace('_', ' ')}
                  </span>
                  <span className="text-gray-700">{entry.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {entries.length === 0 && <p className="text-gray-500">Nothing scheduled in this range.</p>}
      </div>
    </div>
  )
}
