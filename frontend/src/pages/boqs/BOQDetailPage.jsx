import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClipboardCheck, Plus } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import ProductSearchInput from '../../components/ProductSearchInput'
import ReturnsChecklistModal from '../../components/ReturnsChecklistModal'
import { SkeletonCard } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'
import { returnStatus } from '../../lib/returns'

const STATUS_STYLES = {
  stock_deducted: 'bg-green-100 text-green-800',
  requested: 'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-blue-100 text-blue-800',
}

const BOQ_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

export default function BOQDetailPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)
  const canSignOffReturns = hasRole(roles.ADMIN, roles.STOREKEEPER)

  const [boq, setBoq] = useState(null)
  const [products, setProducts] = useState([])
  const [order, setOrder] = useState(null)
  const [event, setEvent] = useState(null)
  const [stockOuts, setStockOuts] = useState(null)
  const [showReturnsChecklist, setShowReturnsChecklist] = useState(false)
  const [error, setError] = useState('')
  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productResetKey, setProductResetKey] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addError, setAddError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api.get(`/boqs/${id}/`).then((res) => setBoq(res.data)).catch(() => setError('Could not load this BOQ.'))
  }
  const loadProducts = () => {
    api.get('/products/').then((res) => setProducts(res.data.results ?? res.data)).catch(() => {})
  }
  const loadStockOuts = () => {
    api.get('/stock-out/').then((res) => setStockOuts(res.data.results ?? res.data)).catch(() => {})
  }

  useEffect(load, [id])
  useEffect(loadProducts, [])

  useEffect(() => {
    if (!boq) return
    api.get(`/orders/${boq.event}/`).then((res) => setOrder(res.data)).catch(() => {})
  }, [boq])

  useEffect(() => {
    if (!order) return
    api.get(`/events/${order.event}/`).then((res) => setEvent(res.data)).catch(() => {})
  }, [order])

  useEffect(() => {
    if (order?.execution_status !== 'completed') return
    loadStockOuts()
  }, [order])

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!productId && !productQuery.trim()) {
      setAddError('Type or select a product.')
      return
    }
    setSubmitting(true)
    setAddError('')
    try {
      const payload = { boq: id, quantity_requested: quantity }
      if (productId) payload.product = productId
      else payload.product_name = productQuery.trim()

      await api.post('/boq-items/', payload)
      setProductId('')
      setProductQuery('')
      setProductResetKey((k) => k + 1)
      setQuantity(1)
      load()
      loadProducts()
    } catch (err) {
      setAddError('Could not add this item.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!boq) return <SkeletonCard />

  const totalQuantity = boq.items.reduce((sum, item) => sum + item.quantity_requested, 0)
  const isEditable = boq.status === 'pending' || boq.status === 'rejected'
  const isCompleted = order?.execution_status === 'completed'
  const returnableStockOuts = (stockOuts ?? []).filter(
    (so) => so.product_returnable && order && so.event === order.event
  )
  const returnsSignedOff =
    returnableStockOuts.length > 0 && returnableStockOuts.every((so) => so.returned || so.missing_reported_at)

  return (
    <div className="max-w-3xl">
      <Link to="/boqs" className="text-sm text-brand-700 hover:underline">
        ← Back to BOQs
      </Link>
      <div className="mt-2 mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">BOQ #{boq.id}</h1>
        <StatusBadge status={boq.status} styles={BOQ_STATUS_STYLES} />
      </div>

      {boq.status === 'rejected' && boq.rejection_reason && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="mb-1 text-sm font-bold text-red-800">Rejected — reason given</h3>
          <p className="text-sm text-red-700">{boq.rejection_reason}</p>
          <p className="mt-2 text-xs text-red-600">
            Adjust the items below to address the feedback — this BOQ will automatically return to Pending as soon as you do.
          </p>
        </div>
      )}

      <h2 className="mb-2 text-sm font-bold text-gray-900">Items</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-bold text-gray-700">Product</th>
              <th className="px-4 py-2 text-right font-bold text-gray-700">Quantity</th>
              <th className="px-4 py-2 text-left font-bold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {boq.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2">{products.find((p) => p.id === item.product)?.name ?? `Product #${item.product}`}</td>
                <td className="px-4 py-2 text-right text-gray-700">{item.quantity_requested}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={item.status} styles={STATUS_STYLES} />
                </td>
              </tr>
            ))}
            {boq.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No line items yet.
                </td>
              </tr>
            )}
          </tbody>
          {boq.items.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">TOTAL QUANTITY</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{totalQuantity}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {isCompleted && returnableStockOuts.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Returns Checklist</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {returnableStockOuts.filter((so) => returnStatus(so) === 'returned').length} of{' '}
                {returnableStockOuts.length} returnable item(s) confirmed back
                {returnableStockOuts.some((so) => returnStatus(so) === 'missing') && ' — some flagged missing'}
                {returnsSignedOff && ' — signed off'}.
              </p>
            </div>
            {canSignOffReturns && !returnsSignedOff && (
              <button
                onClick={() => setShowReturnsChecklist(true)}
                className="flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700"
              >
                <ClipboardCheck size={15} />
                Open Returns Checklist
              </button>
            )}
          </div>
        </div>
      )}

      {isPlannerOrAdmin && !isEditable && (
        <p className="mt-6 text-sm text-gray-500">
          This BOQ is {boq.status} and can no longer be edited.
        </p>
      )}

      {isPlannerOrAdmin && isEditable && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Add Item</h3>
          <form onSubmit={handleAddItem} className="flex items-end gap-3">
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
            <label className="w-28">
              <span className="mb-1 block text-sm font-medium text-gray-700">Quantity</span>
              <input required type="number" min="1" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
            >
              <Plus size={16} />
              {submitting ? 'Adding…' : 'Add Item'}
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        </div>
      )}

      {showReturnsChecklist && order && (
        <ReturnsChecklistModal
          eventId={order.event}
          eventName={event?.name ?? 'this job'}
          onClose={() => setShowReturnsChecklist(false)}
          onDone={() => { setShowReturnsChecklist(false); loadStockOuts() }}
        />
      )}
    </div>
  )
}
