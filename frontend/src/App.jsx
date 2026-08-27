import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import EventDetailPage from './pages/events/EventDetailPage'
import EventsListPage from './pages/events/EventsListPage'
import BOQDetailPage from './pages/boqs/BOQDetailPage'
import BOQsListPage from './pages/boqs/BOQsListPage'
import BudgetPage from './pages/budget/BudgetPage'
import CalendarPage from './pages/calendar/CalendarPage'
import GuestsPage from './pages/guests/GuestsPage'
import RsvpPage from './pages/guests/RsvpPage'
import InquiriesListPage from './pages/inquiries/InquiriesListPage'
import ProductsListPage from './pages/inventory/ProductsListPage'
import LoginPage from './pages/LoginPage'
import TripMapPage from './pages/logistics/TripMapPage'
import VehiclesListPage from './pages/logistics/VehiclesListPage'
import OrdersListPage from './pages/orders/OrdersListPage'
import PoliciesPage from './pages/policies/PoliciesPage'
import RequisitionsListPage from './pages/requisitions/RequisitionsListPage'
import StaffTeamsPage from './pages/staffing/StaffTeamsPage'
import VendorsPage from './pages/vendors/VendorsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/rsvp/:token" element={<RsvpPage />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/events" element={<EventsListPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />

        <Route path="/inquiries" element={<InquiriesListPage />} />
        <Route path="/orders" element={<OrdersListPage />} />
        <Route path="/boqs" element={<BOQsListPage />} />
        <Route path="/boqs/:id" element={<BOQDetailPage />} />
        <Route path="/requisitions" element={<RequisitionsListPage />} />
        <Route path="/products" element={<ProductsListPage />} />
        <Route path="/staff" element={<StaffTeamsPage />} />
        <Route path="/vehicles" element={<VehiclesListPage />} />
        <Route path="/trips/:id" element={<TripMapPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/guests" element={<GuestsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
