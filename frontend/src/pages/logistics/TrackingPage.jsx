import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { Gauge, Phone, Route, Search, Truck, User } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { SkeletonBlock } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const POLL_INTERVAL_MS = 5000
const AUTO_PING_INTERVAL_MS = 20000

const TRIP_STATUS_STYLES = {
  scheduled: 'bg-gray-100 text-gray-600',
  en_route: 'bg-blue-100 text-blue-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  returning: 'bg-brand-100 text-brand-800',
  completed: 'bg-green-100 text-green-800',
}

const DETAIL_TABS = [
  { key: 'trip', label: 'Trip Details' },
  { key: 'driver', label: 'Driver' },
  { key: 'vehicle', label: 'Vehicle' },
]

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Recenter({ position, tripId }) {
  const map = useMap()
  const zoomedTripRef = useRef(null)
  useEffect(() => {
    if (!position) return
    if (zoomedTripRef.current !== tripId) {
      map.setView(position, 14)
      zoomedTripRef.current = tripId
    } else {
      map.panTo(position)
    }
  }, [position, tripId, map])
  return null
}

export default function TrackingPage() {
  const { user } = useAuth()

  const [assignments, setAssignments] = useState(null)
  const [events, setEvents] = useState([])
  const [staff, setStaff] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [activeDetailTab, setActiveDetailTab] = useState('trip')

  const [history, setHistory] = useState([])
  const [ping, setPing] = useState(null)
  const [pingStatus, setPingStatus] = useState('')
  const [isAssignedDriver, setIsAssignedDriver] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const pollRef = useRef(null)

  const load = () => {
    Promise.all([
      api.get('/vehicle-assignments/'),
      api.get('/events/'),
      api.get('/staff/'),
      api.get('/vehicles/'),
    ])
      .then(([aRes, eRes, sRes, vRes]) => {
        const list = aRes.data.results ?? aRes.data
        setAssignments(list)
        setEvents(eRes.data.results ?? eRes.data)
        setStaff(sRes.data.results ?? sRes.data)
        setVehicles(vRes.data.results ?? vRes.data)
        setSelectedId((current) => current ?? list.find((a) => a.trip?.status === 'en_route')?.id ?? list[0]?.id ?? null)
      })
      .catch(() => setError('Could not load trips.'))
  }

  useEffect(load, [])

  const eventFor = (id) => events.find((e) => e.id === id)
  const staffFor = (id) => staff.find((s) => s.id === id)
  const vehicleFor = (id) => vehicles.find((v) => v.id === id)

  const selected = assignments?.find((a) => a.id === selectedId) ?? null
  const tripId = selected?.trip?.id

  const pollLatest = () => {
    if (!tripId) return
    Promise.all([
      api.get(`/trips/${tripId}/location/latest/`).catch((err) => {
        if (err.response?.status === 404) setPingStatus('No location pings recorded yet.')
        return null
      }),
      api.get(`/trips/${tripId}/location/history/`).catch(() => null),
    ]).then(([latestRes, historyRes]) => {
      if (latestRes) { setPing(latestRes.data); setPingStatus('') }
      if (historyRes) setHistory(historyRes.data)
    })
  }

  useEffect(() => {
    setPing(null)
    setHistory([])
    setPingStatus('')
    setActiveDetailTab('trip')
    if (!tripId) return

    const staffRecord = selected ? staffFor(selected.driver) : null
    setIsAssignedDriver(!!staffRecord && staffRecord.user === user?.id)

    pollLatest()
    pollRef.current = setInterval(pollLatest, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const runTripAction = async (action) => {
    setBusy(true)
    setActionError('')
    try {
      await api.post(`/trips/${tripId}/${action}/`)
      load()
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
          await api.post(`/trips/${tripId}/location/`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          })
          pollLatest()
          setActionError('')
        } catch {
          setActionError('Could not send location.')
        }
      },
      () => setActionError('Could not get your current location.')
    )
  }

  const tripStatus = selected?.trip?.status

  useEffect(() => {
    if (!isAssignedDriver || tripStatus !== 'en_route') return
    sendCurrentLocation()
    const autoPingId = setInterval(sendCurrentLocation, AUTO_PING_INTERVAL_MS)
    return () => clearInterval(autoPingId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssignedDriver, tripStatus, tripId])

  if (error) return <p className="text-red-600">{error}</p>
  if (!assignments) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="h-96 w-full" />
      </div>
    )
  }

  const visibleAssignments = assignments.filter((a) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    const eventName = eventFor(a.event)?.name ?? ''
    const vehicle = vehicleFor(a.vehicle)?.plate_no ?? ''
    const driver = staffFor(a.driver)?.name ?? ''
    return `${eventName} ${vehicle} ${driver}`.toLowerCase().includes(q)
  })

  const coords = history.map((p) => [Number(p.latitude), Number(p.longitude)])
  const position = ping ? [Number(ping.latitude), Number(ping.longitude)] : coords[coords.length - 1] ?? null

  let distanceKm = 0
  for (let i = 1; i < coords.length; i++) distanceKm += haversineKm(coords[i - 1], coords[i])

  let speedKmh = null
  if (history.length >= 2) {
    const a = history[history.length - 2]
    const b = history[history.length - 1]
    const hours = (new Date(b.recorded_at) - new Date(a.recorded_at)) / 3600000
    const dist = haversineKm([Number(a.latitude), Number(a.longitude)], [Number(b.latitude), Number(b.longitude)])
    if (hours > 0) speedKmh = dist / hours
  }

  const selectedEvent = selected ? eventFor(selected.event) : null
  const selectedVehicle = selected ? vehicleFor(selected.vehicle) : null
  const selectedDriver = selected ? staffFor(selected.driver) : null

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Tracking Orders</h1>

      <div className="flex flex-col gap-4 lg:h-[calc(100vh-180px)] lg:flex-row">
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:w-96 lg:shrink-0">
          <div className="border-b border-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Active Trips</h2>
              <span className="text-xs text-gray-400">{visibleAssignments.length}</span>
            </div>
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trips…"
                className="input pl-8 text-sm"
              />
            </label>
          </div>
          <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
            {visibleAssignments.map((a) => {
              const ev = eventFor(a.event)
              const veh = vehicleFor(a.vehicle)
              const drv = staffFor(a.driver)
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`block w-full px-4 py-3 text-left transition-colors duration-150 ${
                    selectedId === a.id ? 'bg-brand-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">{ev?.name ?? `Event #${a.event}`}</span>
                    <StatusBadge status={a.trip?.status} styles={TRIP_STATUS_STYLES} />
                  </div>
                  <p className="truncate text-xs text-gray-500">{veh?.plate_no} · {veh?.type} · {drv?.name}</p>
                  <p className="text-xs text-gray-400">{new Date(a.dispatch_time).toLocaleString()}</p>
                </button>
              )
            })}
            {visibleAssignments.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No trips match your search.</p>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white">
          {!selected ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-gray-400">
              No trips yet.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 p-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedEvent?.name ?? `Event #${selected.event}`}</h2>
                  <p className="text-sm text-gray-500">{selectedVehicle?.plate_no} · {selectedVehicle?.type}</p>
                </div>
                <StatusBadge status={selected.trip?.status} styles={TRIP_STATUS_STYLES} />
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-gray-100 p-4 sm:grid-cols-4">
                <Stat icon={Route} label="Distance Traveled" value={`${distanceKm.toFixed(1)} km`} />
                <Stat icon={Gauge} label="Current Speed" value={speedKmh != null ? `${speedKmh.toFixed(0)} km/h` : '—'} />
                <Stat
                  icon={Truck}
                  label="Last Ping"
                  value={ping ? `${ping.seconds_since_ping ?? 0}s ago` : pingStatus || 'No pings yet'}
                />
                <Stat icon={User} label="Driver" value={selectedDriver?.name ?? '—'} />
              </div>

              <div className="h-80 shrink-0 border-b border-gray-100">
                <MapContainer center={position ?? [0, 0]} zoom={position ? 14 : 2} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {coords.length > 1 && <Polyline positions={coords} color="#084b9a" weight={3} />}
                  {position && (
                    <>
                      <Marker position={position}>
                        <Popup>{ping ? `Last seen ${new Date(ping.recorded_at).toLocaleString()}` : 'Last known position'}</Popup>
                      </Marker>
                      <Recenter position={position} tripId={tripId} />
                    </>
                  )}
                </MapContainer>
              </div>

              <div className="flex gap-1 border-b border-gray-100 px-4 pt-3">
                {DETAIL_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveDetailTab(t.key)}
                    className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      activeDetailTab === t.key ? 'border-b-2 border-brand-600 text-brand-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4">
                {activeDetailTab === 'trip' && (
                  <div className="space-y-2 text-sm">
                    <Row label="Venue">{selectedEvent?.venue ?? '—'}</Row>
                    <Row label="Dispatch time">{new Date(selected.dispatch_time).toLocaleString()}</Row>
                    <Row label="Return time">{selected.return_time ? new Date(selected.return_time).toLocaleString() : '—'}</Row>
                    <Row label="Started">{selected.trip?.started_at ? new Date(selected.trip.started_at).toLocaleString() : '—'}</Row>
                    <Row label="Ended">{selected.trip?.ended_at ? new Date(selected.trip.ended_at).toLocaleString() : '—'}</Row>
                    <Link to={`/trips/${tripId}`} className="inline-block text-sm font-medium text-brand-700 hover:underline">
                      Open full trip page →
                    </Link>
                  </div>
                )}

                {activeDetailTab === 'driver' && (
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <User size={20} />
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{selectedDriver?.name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{selectedDriver?.role ?? 'Driver'}</p>
                      </div>
                      {selectedDriver?.contact && (
                        <a
                          href={`tel:${selectedDriver.contact}`}
                          className="ml-auto flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <Phone size={13} />
                          Call
                        </a>
                      )}
                    </div>
                    <Row label="Contact">{selectedDriver?.contact || '—'}</Row>
                    <Row label="Active">{selectedDriver?.active ? 'Yes' : 'No'}</Row>

                    {isAssignedDriver && (
                      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Driver Controls</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {selected.trip?.status === 'scheduled' && (
                            <button
                              disabled={busy}
                              onClick={() => runTripAction('start')}
                              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                            >
                              Start Trip
                            </button>
                          )}
                          {selected.trip?.status === 'en_route' && (
                            <>
                              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                                Tracking active — sending every 20s
                              </span>
                              <button
                                disabled={busy}
                                onClick={sendCurrentLocation}
                                className="rounded-md bg-brand-100 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-200 disabled:opacity-60"
                              >
                                Send Location Now
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => runTripAction('end')}
                                className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                              >
                                End Trip
                              </button>
                            </>
                          )}
                          {selected.trip?.status === 'completed' && <span className="text-sm text-gray-500">This trip has ended.</span>}
                        </div>
                        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'vehicle' && (
                  <div className="space-y-2 text-sm">
                    <Row label="Plate number">{selectedVehicle?.plate_no ?? '—'}</Row>
                    <Row label="Type">{selectedVehicle?.type ?? '—'}</Row>
                    <Row label="Capacity">{selectedVehicle?.capacity ?? '—'}</Row>
                    <Row label="Status">{selectedVehicle?.status?.replace('_', ' ') ?? '—'}</Row>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}
