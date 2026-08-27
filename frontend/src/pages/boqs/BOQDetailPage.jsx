import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonCard } from '../../components/Skeleton'
import StatusBadge from '../../components/StatusBadge'

const STATUS_STYLES = {
  stock_deducted: 'bg-green-100 text-green-800',
  requested: 'bg-yellow-100 text-yellow-800',
  fulfilled: 'bg-blue-100 text-blue-800',
}

export default function BOQDetailPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const isPlannerOrAdmin = hasRole(roles.ADMIN, roles.EVENT_PLANNER)

  const [boq, setBoq] = useState(null)
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addError, setAddError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api.get(`/boqs/${id}/`).then((res) => setBoq(res.data)).catch(() => setError('Could not load this BOQ.'))
  }

  useEffect(load, [id])
  useEffect(() => {
    api.get('/products/').then((res) => setProducts(res.data.results ?? res.data)).catch(() => {})
  }, [])

  const handleAddItem = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setAddError('')
    try {
      await api.post('/boq-items/', { boq: id, product: productId, quantity_requested: quantity })
      setProductId('')
      setQuantity(1)
      load()
    } catch (err) {
      setAddError('Could not add this item.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!boq) return <SkeletonCard />

  return (
    <div className="max-w-2xl">
      <Link to="/boqs" className="text-sm text-brand-700 hover:underline">
        ← Back to BOQs
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-gray-900">BOQ #{boq.id}</h1>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Product</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Quantity</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
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
        </table>
      </div>

      {isPlannerOrAdmin && (
        <form onSubmit={handleAddItem} className="mt-6 flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium text-gray-700">Product</span>
            <select required className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.availability} available)</option>
              ))}
            </select>
          </label>
          <label className="w-28">
            <span className="mb-1 block text-sm font-medium text-gray-700">Quantity</span>
            <input required type="number" min="1" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Add Item
          </button>
        </form>
      )}
      {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
    </div>
  )
}
