import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bell, Check, ClipboardList, X } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import * as roles from '../roles'

export default function NotificationBell() {
  const { hasRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [dismissed, setDismissed] = useState(() => new Set())
  const [read, setRead] = useState(() => new Set())
  const ref = useRef(null)

  const canSeeStock = hasRole(roles.ADMIN, roles.STOREKEEPER)
  const canSeeRequisitions = hasRole(roles.ADMIN, roles.ACCOUNTS)

  useEffect(() => {
    const fetches = []
    if (canSeeStock) {
      fetches.push(
        api.get('/products/low-stock/').then((res) =>
          res.data.map((p) => ({
            id: `stock-${p.id}`,
            icon: AlertTriangle,
            tone: 'text-yellow-600',
            message: `${p.name} is low on stock (${p.availability} available, reorder at ${p.reorder_threshold})`,
          }))
        )
      )
    }
    if (canSeeRequisitions) {
      fetches.push(
        api.get('/requisitions/').then((res) => {
          const list = res.data.results ?? res.data
          return list
            .filter((r) => r.status === 'pending')
            .map((r) => ({
              id: `req-${r.id}`,
              icon: ClipboardList,
              tone: 'text-brand-600',
              message: `Requisition pending approval: ${r.description}`,
            }))
        })
      )
    }
    Promise.all(fetches).then((results) => setItems(results.flat())).catch(() => {})
  }, [canSeeStock, canSeeRequisitions])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const visible = items.filter((i) => !dismissed.has(i.id))
  const unreadCount = visible.filter((i) => !read.has(i.id)).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-slide-up absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-900">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">You're all caught up.</p>
            )}
            {visible.map((item) => {
              const Icon = item.icon
              const isRead = read.has(item.id)
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 border-b border-gray-50 px-4 py-3 text-sm last:border-0 ${isRead ? 'bg-white' : 'bg-brand-50/40'}`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${item.tone}`} />
                  <p className="flex-1 text-gray-700">{item.message}</p>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!isRead && (
                      <button
                        onClick={() => setRead((prev) => new Set(prev).add(item.id))}
                        className="text-gray-400 hover:text-brand-600"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setDismissed((prev) => new Set(prev).add(item.id))}
                      className="text-gray-400 hover:text-red-600"
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
