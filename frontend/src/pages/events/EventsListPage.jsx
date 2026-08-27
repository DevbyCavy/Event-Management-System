import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { SkeletonTable } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
}

export default function EventsListPage() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/events/')
      .then((res) => setEvents(res.data.results ?? res.data))
      .catch(() => setError('Could not load events.'))
  }, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!events) return <SkeletonTable />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Events</h1>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Classification</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link to={`/events/${event.id}`} className="text-brand-700 hover:underline">
                    {event.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-700">{event.type}</td>
                <td className="px-4 py-2 text-gray-700">
                  {new Date(event.date_start).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-gray-700 capitalize">{event.classification}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={event.event_status} styles={STATUS_STYLES} />
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
