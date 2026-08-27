import { useEffect, useState } from 'react'
import api from '../../api/client'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'

const EMPTY_PRODUCT = {
  name: '', brand: '', equipment_type: '', category: '', returnable: true,
  quantity_total: 0, reorder_threshold: 0, notes: '',
}

export default function ProductsListPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.STOREKEEPER)

  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [stockModal, setStockModal] = useState(null) // { product, mode: 'in' | 'out' }

  const load = () => {
    api
      .get('/products/')
      .then((res) => setProducts(res.data.results ?? res.data))
      .catch(() => setError('Could not load products.'))
  }

  useEffect(load, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!products) return <SkeletonTable />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Store Inventory</h1>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add Product
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Returnable</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">In Use</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Available</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => {
              const low = product.availability < product.reorder_threshold
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {product.name}
                    {product.brand && <span className="text-gray-400"> · {product.brand}</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{product.category}</td>
                  <td className="px-4 py-2 text-gray-700">{product.returnable ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{product.quantity_total}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{product.quantity_in_use}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={low ? 'font-semibold text-red-600' : 'text-gray-900'}>
                      {product.availability}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setStockModal({ product, mode: 'in' })}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        Stock In
                      </button>
                      <button
                        onClick={() => setStockModal({ product, mode: 'out' })}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        Stock Out
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateProductModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
      {stockModal && (
        <StockMovementModal
          product={stockModal.product}
          mode={stockModal.mode}
          onClose={() => setStockModal(null)}
          onDone={() => { setStockModal(null); load() }}
        />
      )}
    </div>
  )
}

function CreateProductModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [field]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/products/', form)
      onCreated()
    } catch {
      setError('Could not create this product.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Name">
          <input required className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Brand">
          <input className="input" value={form.brand} onChange={set('brand')} />
        </Field>
        <Field label="Equipment type">
          <input required className="input" value={form.equipment_type} onChange={set('equipment_type')} />
        </Field>
        <Field label="Category">
          <input required className="input" value={form.category} onChange={set('category')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.returnable} onChange={set('returnable')} />
          Returnable
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Initial quantity">
            <input required type="number" min="0" className="input" value={form.quantity_total} onChange={set('quantity_total')} />
          </Field>
          <Field label="Reorder threshold">
            <input required type="number" min="0" className="input" value={form.reorder_threshold} onChange={set('reorder_threshold')} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Add Product'}
        </button>
      </form>
    </Modal>
  )
}

function StockMovementModal({ product, mode, onClose, onDone }) {
  const isIn = mode === 'in'
  const today = new Date().toISOString().slice(0, 10)
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(
    isIn
      ? { quantity: 1, unit_cost: '', supplier: '', date: today }
      : { quantity: 1, event: '', date: today, expected_return_date: '' }
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isIn) {
      api.get('/events/').then((res) => setEvents(res.data.results ?? res.data)).catch(() => {})
    }
  }, [isIn])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...form, product: product.id }
      if (!isIn && !payload.event) delete payload.event
      if (!isIn && !payload.expected_return_date) delete payload.expected_return_date
      await api.post(isIn ? '/stock-in/' : '/stock-out/', payload)
      onDone()
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] ?? 'Could not record this movement.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`${isIn ? 'Stock In' : 'Stock Out'} — ${product.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Quantity">
          <input required type="number" min="1" className="input" value={form.quantity} onChange={set('quantity')} />
        </Field>

        {isIn ? (
          <>
            <Field label="Unit cost">
              <input required type="number" step="0.01" min="0" className="input" value={form.unit_cost} onChange={set('unit_cost')} />
            </Field>
            <Field label="Supplier">
              <input required className="input" value={form.supplier} onChange={set('supplier')} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Event (optional)">
              <select className="input" value={form.event} onChange={set('event')}>
                <option value="">— None —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </Field>
            {product.returnable && (
              <Field label="Expected return date">
                <input type="date" className="input" value={form.expected_return_date} onChange={set('expected_return_date')} />
              </Field>
            )}
          </>
        )}

        <Field label="Date">
          <input required type="date" className="input" value={form.date} onChange={set('date')} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}
