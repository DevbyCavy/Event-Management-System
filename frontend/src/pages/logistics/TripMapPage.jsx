import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { SkeletonBlock } from '../../components/Skeleton'

const POLL_INTERVAL_MS = 5000
const AUTO_PING_INTERVAL_MS = 20000

function Recenter({ position }) {
  const map = useMap()
  const zoomedRef = useRef(false)
  useEffect(() => {
    if (!position) return
    if (!zoomedRef.current) {
      map.setView(position, 14)
      zoomedRef.current = true
    } else {
      map.panTo(position)
    }
  }, [position, map])
  return null
}

export default function TripMapPage() {
  const { id } = useParams()
  const { user } = useAuth()

  const [trip, setTrip] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [isAssignedDriver, setIsAssignedDriver] = useState(false)
  const [ping, setPing] = useState(null)
  const [pingStatus, setPingStatus] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const pollRef = useRef(null)

  const loadTrip = () => {
    api.get(`/trips/${id}/`).then((res) => {
      setTrip(res.data)
      return api.get(`/vehicle-assignments/${res.data.vehicle_assignment}/`)
    }).then((res) => {
      setAssignment(res.data)
      return api.get(`/staff/${res.data.driver}/`)
    }).then((res) => {
      setIsAssignedDriver(res.data.user === user?.id)
    }).catch(() => {})
  }

  useEffect(loadTrip, [id, user])

  const pollLatest = () => {
    api.get(`/trips/${id}/location/latest/`)
      .then((res) => { setPing(res.data); setPingStatus('') })
      .catch((err) => {
        if (err.response?.status === 404) setPingStatus('No location pings recorded yet.')
      })
  }

  useEffect(() => {
    pollLatest()
    pollRef.current = setInterval(pollLatest, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [id])

  const runTripAction = async (action) => {
    setBusy(true)
    setActionError('')
    try {
      await api.post(`/trips/${id}/${action}/`)
      loadTrip()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : `Could not ${action} trip.`)
    } finally {
      setBusy(false)
    }
  }

  const sendCurrentLocation = () => {
    if (!navigator.geolocation) {
      setActionError('Geolocation is not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post(`/trips/${id}/location/`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
          pollLatest()
          setActionError('')
        } catch (err) {
          setActionError('Could not send location.')
        }
      },
      () => setActionError('Could not get your current location.')
    )
  }

  useEffect(() => {
    if (!isAssignedDriver || trip?.status !== 'en_route') return
    sendCurrentLocation()
    const autoPingId = setInterval(sendCurrentLocation, AUTO_PING_INTERVAL_MS)
    return () => clearInterval(autoPingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssignedDriver, trip?.status, id])

  if (!trip) {
    return (
      <div className="max-w-3xl">
        <SkeletonBlock className="mb-4 h-4 w-40" />
        <SkeletonBlock className="mb-4 h-6 w-32" />
        <SkeletonBlock className="h-96 w-full" />
      </div>
    )
  }

  const position = ping ? [Number(ping.latitude), Number(ping.longitude)] : null

  return (
    <div className="max-w-3xl">
      <Link to="/vehicles" className="text-sm text-brand-700 hover:underline">
        ← Back to vehicles
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold text-gray-900">Trip #{trip.id}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          Status: {trip.status.replace('_', ' ')}
        </span>
        {ping ? (
          <span className="text-sm text-gray-500">
            Last seen: {new Date(ping.recorded_at).toLocaleTimeString()}
            {typeof ping.seconds_since_ping === 'number' && ` (${ping.seconds_since_ping}s ago)`}
          </span>
        ) : (
          <span className="text-sm text-gray-500">{pingStatus}</span>
        )}
      </div>

      <div className="h-96 overflow-hidden rounded-lg border border-gray-200">
        <MapContainer center={position ?? [0, 0]} zoom={position ? 15 : 2} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && (
            <>
              <Marker position={position}>
                <Popup>Last seen {new Date(ping.recorded_at).toLocaleString()}</Popup>
              </Marker>
              <Recenter position={position} />
            </>
          )}
        </MapContainer>
      </div>

      {isAssignedDriver && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Driver Controls</h2>
          <div className="flex flex-wrap items-center gap-3">
            {trip.status === 'scheduled' && (
              <button
                disabled={busy}
                onClick={() => runTripAction('start')}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Start Trip
              </button>
            )}
            {trip.status === 'en_route' && (
              <>
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  Tracking active — sending your location every 20s
                </span>
                <button
                  disabled={busy}
                  onClick={sendCurrentLocation}
                  className="rounded-md bg-brand-100 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-200 disabled:opacity-60"
                >
                  Send Location Now
                </button>
                <button
                  disabled={busy}
                  onClick={() => runTripAction('end')}
                  className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  End Trip
                </button>
              </>
            )}
            {trip.status === 'completed' && <span className="text-sm text-gray-500">This trip has ended.</span>}
          </div>
          {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
        </div>
      )}
    </div>
  )
}
