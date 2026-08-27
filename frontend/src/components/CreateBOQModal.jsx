import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import api from '../api/client'
import Modal from './Modal'
import ProductSearchInput from './ProductSearchInput'
import StatusBadge from './StatusBadge'

const ITEM_STATUS_STYLES = {
  stock_deducted: 'bg-green-100 text-green-800',
  requested: 'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-blue-100 text-blue-800',
}

export default function CreateBOQModal({ orders, events, onClose, onCreated }) {
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [boq, setBoq] = useState(null)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([])
  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productResetKey, setProductResetKey] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadProducts = () => {
    api.get('/products/').then((res) => setProducts(res.data.results ?? res.data)).catch(() => {})
  }

  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data.results ?? res.data)).catch(() => {})
    loadProducts()
  }, [])

  const eventFor = (order) => events.find((e) => e.id === order.event)
  const userName = (id) => users.find((u) => u.id === id)?.username ?? '—'

  const filteredOrders = orders.filter((order) => {
    const name = eventFor(order)?.name ?? ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const selectOrder = async (order) => {
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/boqs/', { event: order.id })
      setBoq(res.data)
      setItems(res.data.items ?? [])
      setSelectedOrder(order)
    } catch (err) {
      setError(err.response?.data?.[0] ?? err.response?.data?.event?.[0] ?? 'Could not create BOQ.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!productId && !productQuery.trim()) {
      setError('Type or select a product.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = { boq: boq.id, quantity_requested: quantity }
      if (productId) payload.product = productId
      else payload.product_name = productQuery.trim()

      const res = await api.post('/boq-items/', payload)
      setItems([...items, res.data])
      setProductId('')
      setProductQuery('')
      setProductResetKey((k) => k + 1)
      setQuantity(1)
      loadProducts()
    } catch {
      setError('Could not add this item.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity_requested), 0)
  const event = selectedOrder ? eventFor(selectedOrder) : null

  return (
    <Modal title="Create BOQ" onClose={() => { onClose(); if (boq) onCreated() }} maxWidth="max-w-2xl">
      {!selectedOrder ? (
        <div>
          <p className="mb-3 text-sm text-gray-600">Search for an approved order to create a BOQ for.</p>
          <label className="relative mb-3 block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event name…"
              className="input pl-9"
            />
          </label>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                disabled={submitting}
                onClick={() => selectOrder(order)}
                className="block w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
              >
                {eventFor(order)?.name ?? `Event #${order.event}`}
              </button>
            ))}
            {filteredOrders.length === 0 && (
              <p className="text-sm text-gray-500">No approved orders match your search.</p>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <Row label="Event">{event?.name}</Row>
            <Row label="Venue">{event?.venue}</Row>
            <Row label="Client">{userName(event?.client)}</Row>
            <Row label="Classification">
              <span className="capitalize">{event?.classification}</span>
            </Row>
            <Row label="Starts" last>{event?.date_start ? new Date(event.date_start).toLocaleString() : '—'}</Row>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-gray-900">Items</h3>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Product</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-700">Quantity</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{products.find((p) => p.id === item.product)?.name ?? `Product #${item.product}`}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{item.quantity_requested}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status} styles={ITEM_STATUS_STYLES} />
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-400">No items added yet.</td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
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

          <form onSubmit={handleAddItem} className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <label className="flex-1">
              <span className="mb-1 block text-sm font-medium text-gray-700">Product</span>
              <ProductSearchInput
                key={productResetKey}
                products={products}
                value={productId}
                onSelect={setProductId}
                onQueryChange={setProductQuery}
              />
            </label>
            <label className="w-24">
              <span className="mb-1 block text-sm font-medium text-gray-700">Quantity</span>
              <input required type="number" min="1" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
            >
              <Plus size={16} />
              Add Item
            </button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => { onClose(); onCreated() }}
            className="w-full rounded-md bg-gray-800 px-4 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-gray-900"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  )
}

function Row({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-1 ${last ? '' : 'border-b border-gray-200'}`}>
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}
