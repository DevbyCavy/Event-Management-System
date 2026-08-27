import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import api from '../../api/client'
import ConfirmModal from '../../components/ConfirmModal'
import Modal from '../../components/Modal'
import { useAuth } from '../../auth/AuthContext'
import * as roles from '../../roles'
import { SkeletonTable } from '../../components/Skeleton'

const EMPTY_PRODUCT = {
  name: '', brand: '', sku: '', color: '', price: '', equipment_type: '', category: '', returnable: true,
  quantity_total: 0, reorder_threshold: 0, notes: '',
}

const STOCK_TABS = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
]

const PRICE_RANGES = [
  { key: '0-100', label: '$0 – $100', test: (p) => p >= 0 && p <= 100 },
  { key: '100-500', label: '$100 – $500', test: (p) => p > 100 && p <= 500 },
  { key: '500-1000', label: '$500 – $1,000', test: (p) => p > 500 && p <= 1000 },
  { key: '1000+', label: '$1,000+', test: (p) => p > 1000 },
]

function countBy(products, getKey) {
  const counts = {}
  products.forEach((p) => {
    const key = getKey(p)
    if (!key) return
    counts[key] = (counts[key] ?? 0) + 1
  })
  return counts
}

export default function ProductsCatalogPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(roles.ADMIN, roles.STOREKEEPER)

  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')
  const [stockTab, setStockTab] = useState('all')
  const [categories, setCategories] = useState(new Set())
  const [brands, setBrands] = useState(new Set())
  const [colors, setColors] = useState(new Set())
  const [priceRanges, setPriceRanges] = useState(new Set())

  const [showCreate, setShowCreate] = useState(false)
  const [viewProduct, setViewProduct] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [stockModal, setStockModal] = useState(null) // { product, mode: 'in' | 'out' }
  const [confirmTarget, setConfirmTarget] = useState(null)

  const load = () => {
    api
      .get('/products/')
      .then((res) => setProducts(res.data.results ?? res.data))
      .catch(() => setError('Could not load products.'))
  }

  useEffect(load, [])

  const toggle = (set, setSet, value) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setSet(next)
  }

  const clearFilters = () => {
    setCategories(new Set())
    setBrands(new Set())
    setColors(new Set())
    setPriceRanges(new Set())
  }

  const categoryCounts = useMemo(() => products ? countBy(products, (p) => p.category) : {}, [products])
  const brandCounts = useMemo(() => products ? countBy(products, (p) => p.brand) : {}, [products])
  const colorCounts = useMemo(() => products ? countBy(products, (p) => p.color) : {}, [products])
  const priceCounts = useMemo(() => {
    if (!products) return {}
    const counts = {}
    PRICE_RANGES.forEach((r) => {
      counts[r.key] = products.filter((p) => p.price != null && r.test(Number(p.price))).length
    })
    return counts
  }, [products])

  const visibleProducts = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      if (search.trim() && !`${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(search.trim().toLowerCase())) return false
      if (stockTab === 'low' && !(p.availability < p.reorder_threshold && p.availability > 0)) return false
      if (stockTab === 'out' && p.availability > 0) return false
      if (categories.size && !categories.has(p.category)) return false
      if (brands.size && !brands.has(p.brand)) return false
      if (colors.size && !colors.has(p.color)) return false
      if (priceRanges.size) {
        if (p.price == null) return false
        const matches = [...priceRanges].some((key) => PRICE_RANGES.find((r) => r.key === key)?.test(Number(p.price)))
        if (!matches) return false
      }
      return true
    })
  }, [products, search, stockTab, categories, brands, colors, priceRanges])

  const deleteProduct = async () => {
    const product = confirmTarget
    setBusyId(product.id)
    setActionError('')
    try {
      await api.delete(`/products/${product.id}/`)
      setConfirmTarget(null)
      load()
    } catch (err) {
      setActionError(Array.isArray(err.response?.data) ? err.response.data.join(' ') : 'Could not delete this product.')
      setConfirmTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  if (error) return <p className="text-red-600">{error}</p>
  if (!products) return <SkeletonTable />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <label className="relative w-72 max-w-full">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="input pl-9"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 text-xs">
        {STOCK_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStockTab(t.key)}
            className={`rounded-full border px-2.5 py-1 font-medium transition-colors duration-150 ${
              stockTab === t.key
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
              <button onClick={clearFilters} className="text-xs font-medium text-brand-700 hover:underline">
                Clear all
              </button>
            </div>

            <FilterGroup title="Category" counts={categoryCounts} selected={categories} onToggle={(v) => toggle(categories, setCategories, v)} />
            <FilterGroup title="Brand" counts={brandCounts} selected={brands} onToggle={(v) => toggle(brands, setBrands, v)} />
            <FilterGroup title="Color" counts={colorCounts} selected={colors} onToggle={(v) => toggle(colors, setColors, v)} />

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Price Range</h3>
              <div className="space-y-1.5">
                {PRICE_RANGES.map((r) => (
                  <label key={r.key} className="flex items-center justify-between gap-2 text-sm text-gray-700">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={priceRanges.has(r.key)} onChange={() => toggle(priceRanges, setPriceRanges, r.key)} />
                      {r.label}
                    </span>
                    <span className="text-xs text-gray-400">{priceCounts[r.key] ?? 0}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Price</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Available</th>
                  <th className="px-4 py-2" />
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleProducts.map((product) => {
                  const low = product.availability < product.reorder_threshold
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {product.name}
                        {product.brand && <span className="text-gray-400"> · {product.brand}</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{product.sku || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{product.category}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{product.price ? `$${Number(product.price).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{product.quantity_total}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={low ? 'font-semibold text-red-600' : 'text-gray-900'}>{product.availability}</span>
                      </td>
                      <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                        {canManage && (
                          <>
                            <button onClick={() => setStockModal({ product, mode: 'in' })} className="text-sm font-medium text-brand-700 hover:underline">
                              Stock In
                            </button>
                            <button onClick={() => setStockModal({ product, mode: 'out' })} className="text-sm font-medium text-brand-700 hover:underline">
                              Stock Out
                            </button>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewProduct(product)}
                            title="View product"
                            aria-label="View product"
                            className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                          >
                            <Eye size={16} />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setEditProduct(product)}
                                title="Edit product"
                                aria-label="Edit product"
                                className="text-gray-400 transition-colors duration-150 hover:text-brand-700"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setConfirmTarget(product)}
                                disabled={busyId === product.id}
                                title="Delete product"
                                aria-label="Delete product"
                                className="text-gray-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                      No products match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {canManage && (
        <button
          onClick={() => setShowCreate(true)}
          aria-label="Add Product"
          title="Add Product"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 hover:bg-brand-700 hover:shadow-xl"
        >
          <Plus size={24} />
        </button>
      )}

      {showCreate && (
        <ProductFormModal title="Add Product" onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />
      )}
      {editProduct && (
        <ProductFormModal
          title="Edit Product"
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); load() }}
        />
      )}
      {viewProduct && (
        <ProductViewModal product={viewProduct} onClose={() => setViewProduct(null)} />
      )}
      {stockModal && (
        <StockMovementModal
          product={stockModal.product}
          mode={stockModal.mode}
          onClose={() => setStockModal(null)}
          onDone={() => { setStockModal(null); load() }}
        />
      )}
      {confirmTarget && (
        <ConfirmModal
          title="Delete Product"
          message={`Delete "${confirmTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          busy={busyId === confirmTarget.id}
          onConfirm={deleteProduct}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}

function FilterGroup({ title, counts, selected, onToggle }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  return (
    <div className="mb-4 border-b border-gray-100 pb-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-1.5">
        {entries.map(([label, count]) => (
          <label key={label} className="flex items-center justify-between gap-2 text-sm text-gray-700">
            <span className="flex min-w-0 items-center gap-2">
              <input type="checkbox" checked={selected.has(label)} onChange={() => onToggle(label)} />
              <span className="truncate">{label}</span>
            </span>
            <span className="text-xs text-gray-400">{count}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ProductViewModal({ product, onClose }) {
  return (
    <Modal title="Product Details" onClose={onClose}>
      <div className="space-y-1 text-sm">
        <Row label="Name">{product.name}</Row>
        <Row label="Brand">{product.brand || '—'}</Row>
        <Row label="SKU">{product.sku || '—'}</Row>
        <Row label="Category">{product.category}</Row>
        <Row label="Color">{product.color || '—'}</Row>
        <Row label="Price">{product.price ? `$${Number(product.price).toFixed(2)}` : '—'}</Row>
        <Row label="Equipment type">{product.equipment_type}</Row>
        <Row label="Returnable">{product.returnable ? 'Yes' : 'No'}</Row>
        <Row label="Total quantity">{product.quantity_total}</Row>
        <Row label="In use">{product.quantity_in_use}</Row>
        <Row label="Available">{product.availability}</Row>
        <Row label="Reorder threshold">{product.reorder_threshold}</Row>
        {product.notes && <Row label="Notes" last>{product.notes}</Row>}
      </div>
    </Modal>
  )
}

function Row({ label, children, last }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-1.5 ${last ? '' : 'border-b border-gray-100'}`}>
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  )
}

function ProductFormModal({ title, product, onClose, onSaved }) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name, brand: product.brand, sku: product.sku, color: product.color,
          price: product.price ?? '', equipment_type: product.equipment_type, category: product.category,
          returnable: product.returnable, quantity_total: product.quantity_total,
          reorder_threshold: product.reorder_threshold, notes: product.notes,
        }
      : EMPTY_PRODUCT
  )
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
      const payload = { ...form, price: form.price || null }
      if (product) await api.patch(`/products/${product.id}/`, payload)
      else await api.post('/products/', payload)
      onSaved()
    } catch {
      setError(`Could not ${product ? 'save' : 'create'} this product.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
        <Field label="Name">
          <input required className="input" value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <input className="input" value={form.brand} onChange={set('brand')} />
          </Field>
          <Field label="SKU">
            <input className="input" value={form.sku} onChange={set('sku')} placeholder="e.g. MBP-001" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input required className="input" value={form.category} onChange={set('category')} />
          </Field>
          <Field label="Color">
            <input className="input" value={form.color} onChange={set('color')} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Equipment type">
            <input required className="input" value={form.equipment_type} onChange={set('equipment_type')} />
          </Field>
          <Field label="Price">
            <input type="number" step="0.01" min="0" className="input" value={form.price} onChange={set('price')} placeholder="0.00" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.returnable} onChange={set('returnable')} />
          Returnable
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label={product ? 'Total quantity' : 'Initial quantity'}>
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
          {submitting ? 'Saving…' : product ? 'Save changes' : 'Add Product'}
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
