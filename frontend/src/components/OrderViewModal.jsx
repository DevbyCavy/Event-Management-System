import Modal from './Modal'
import StatusBadge from './StatusBadge'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  signed: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrderViewModal({ order, event, users, onClose }) {
  const userName = (id) => users.find((u) => u.id === id)?.username ?? '—'

  return (
    <Modal title="Order Details" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <Row label="Event">{event?.name ?? `Event #${order.event}`}</Row>
        <Row label="Type">{event?.type || '—'}</Row>
        <Row label="Venue">{event?.venue || '—'}</Row>
        <Row label="Classification">
          <span className="capitalize">{event?.classification || '—'}</span>
        </Row>
        <Row label="Client">{userName(event?.client)}</Row>
        <Row label="Planner">{userName(event?.planner)}</Row>
        <Row label="Starts">{event?.date_start ? new Date(event.date_start).toLocaleString() : '—'}</Row>
        <Row label="Ends">{event?.date_end ? new Date(event.date_end).toLocaleString() : '—'}</Row>
        <Row label="Order status">
          <StatusBadge status={order.order_status} styles={STATUS_STYLES} />
        </Row>
        <Row label="Signed">{order.signed_at ? new Date(order.signed_at).toLocaleString() : '—'}</Row>
        <Row label="Approved">{order.approved_at ? new Date(order.approved_at).toLocaleString() : '—'}</Row>
        <Row label="Deadline">{order.deadline_datetime ? new Date(order.deadline_datetime).toLocaleString() : '—'}</Row>
      </div>
    </Modal>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}
