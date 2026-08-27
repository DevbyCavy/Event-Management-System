import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api/client'
import { SkeletonBlock } from '../../components/Skeleton'

const OPTIONS = [
  { value: 'accepted', label: "Yes, I'll be there" },
  { value: 'declined', label: "No, I can't make it" },
  { value: 'maybe', label: 'Maybe' },
]

export default function RsvpPage() {
  const { token } = useParams()
  const [guest, setGuest] = useState(null)
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get(`/rsvp/${token}/`)
      .then((res) => { setGuest(res.data); setDietaryNotes(res.data.dietary_notes ?? '') })
      .catch(() => setError('This RSVP link is invalid.'))
  }, [token])

  const submit = async (rsvp_status) => {
    setSaving(true)
    setError('')
    try {
      const res = await api.patch(`/rsvp/${token}/`, { rsvp_status, dietary_notes: dietaryNotes })
      setGuest(res.data)
      setSaved(true)
    } catch {
      setError('Could not save your RSVP. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <CenteredCard><p className="text-red-600">{error}</p></CenteredCard>
  if (!guest) {
    return (
      <CenteredCard>
        <SkeletonBlock className="mb-2 h-5 w-2/3" />
        <SkeletonBlock className="mb-6 h-3 w-1/2" />
        <SkeletonBlock className="mb-2 h-10 w-full" />
        <SkeletonBlock className="mb-2 h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
      </CenteredCard>
    )
  }

  return (
    <CenteredCard>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">{guest.event_name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {new Date(guest.event_date_start).toLocaleString()} · {guest.event_venue}
      </p>

      <p className="mb-4 text-gray-700">Hi {guest.name}, will you be joining us?</p>

      <div className="mb-4 flex flex-col gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => submit(opt.value)}
            disabled={saving}
            className={`rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60 ${
              guest.rsvp_status === opt.value
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Dietary notes (optional)</span>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          rows={2}
          value={dietaryNotes}
          onChange={(e) => setDietaryNotes(e.target.value)}
          onBlur={() => guest.rsvp_status !== 'pending' && submit(guest.rsvp_status)}
        />
      </label>

      {saved && <p className="mt-4 text-sm text-green-600">Thanks — your RSVP has been saved.</p>}
    </CenteredCard>
  )
}

function CenteredCard({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
