import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Search,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import * as roles from '../roles'
import logo from '../assets/doves-logo.png'
import NotificationBell from './NotificationBell'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/inquiries', label: 'Inquiries', icon: Inbox, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/orders', label: 'Orders', icon: FileText, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/events', label: 'Events', icon: CalendarDays, roles: null },
  { to: '/boqs', label: 'BOQs', icon: ListChecks, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/requisitions', label: 'Requisitions', icon: ClipboardList, roles: [roles.ADMIN, roles.EVENT_PLANNER, roles.ACCOUNTS] },
  { to: '/products', label: 'Store Inventory', icon: Boxes, roles: [roles.ADMIN, roles.STOREKEEPER] },
  { to: '/staff', label: 'Staff & Teams', icon: Users, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/vehicles', label: 'Vehicles & Trips', icon: Truck, roles: [roles.ADMIN, roles.EVENT_PLANNER, roles.TEAM_LEADER] },
  { to: '/vendors', label: 'Vendors', icon: Briefcase, roles: [roles.ADMIN, roles.EVENT_PLANNER, roles.VENDOR] },
  { to: '/budget', label: 'Budget & Payments', icon: Wallet, roles: [roles.ADMIN, roles.EVENT_PLANNER, roles.ACCOUNTS] },
  { to: '/guests', label: 'Guests', icon: UserPlus, roles: null },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, roles: [roles.ADMIN, roles.EVENT_PLANNER] },
  { to: '/policies', label: 'Policies', icon: ShieldCheck, roles: null },
]

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const [bouncing, setBouncing] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles))

  return (
    <div className="flex h-full min-h-screen bg-[#fafafa]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src={logo} alt="Doves" className="h-9 w-auto" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => {
                  setBouncing(item.to)
                  setTimeout(() => setBouncing(null), 260)
                }}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
                  }`
                }
              >
                <Icon size={18} className={bouncing === item.to ? 'animate-icon-bounce' : ''} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <label className="relative w-80 max-w-full">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search…"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-700 transition-colors duration-150 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="flex items-center gap-2">
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-gray-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
                <span className="hidden text-left text-sm sm:block">
                  <span className="block font-medium text-gray-900">{user?.username}</span>
                  <span className="block text-xs text-gray-500">
                    {user?.is_superuser ? 'Superuser' : user?.groups?.join(', ') || 'No role'}
                  </span>
                </span>
              </button>

              {profileOpen && (
                <div className="animate-fade-slide-up absolute right-0 z-50 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main key={location.pathname} className="animate-fade-slide-up flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
