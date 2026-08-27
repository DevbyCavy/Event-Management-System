import Modal from './Modal'
import StatusBadge from './StatusBadge'

const ITEM_STATUS_STYLES = {
  stock_deducted: 'bg-green-100 text-green-800',
  requested: 'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-blue-100 text-blue-800',
}

const BOQ_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

export default function BOQViewModal({ boq, eventName, products, onClose }) {
  const totalQuantity = boq.items.reduce((sum, item) => sum + Number(item.quantity_requested), 0)
  const productName = (id) => products.find((p) => p.id === id)?.name ?? `Product #${id}`

  return (
    <Modal title="BOQ Details" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-4 text-sm">
        <Row label="Event">{eventName}</Row>
        <Row label="Status">
          <StatusBadge status={boq.status} styles={BOQ_STATUS_STYLES} />
        </Row>
        <Row label="Created" last={boq.status !== 'rejected' || !boq.rejection_reason}>
          {new Date(boq.created_at).toLocaleString()}
        </Row>
        {boq.status === 'rejected' && boq.rejection_reason && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-red-800">Reason for rejection</p>
            <p className="mt-1 text-sm text-red-700">{boq.rejection_reason}</p>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Items</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-gray-700">Product</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-700">Quantity</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {boq.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">{productName(item.product)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{item.quantity_requested}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} styles={ITEM_STATUS_STYLES} />
                    </td>
                  </tr>
                ))}
                {boq.items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-gray-400">No items added yet.</td>
                  </tr>
                )}
              </tbody>
              {boq.items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">TOTAL QUANTITY</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-gray-900">{totalQuantity}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-1 ${last ? '' : 'border-b border-gray-100'}`}>
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}
