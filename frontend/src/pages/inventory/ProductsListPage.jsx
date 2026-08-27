import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  Layers,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import api from '../../api/client'
import AnimatedNumber from '../../components/AnimatedNumber'
import BarChart from '../../components/BarChart'
import DonutChart from '../../components/DonutChart'
import { SkeletonCard } from '../../components/Skeleton'

const CATEGORY_COLORS = ['#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']

export default function ProductsListPage() {
  const [products, setProducts] = useState(null)
  const [stockIns, setStockIns] = useState(null)
  const [stockOuts, setStockOuts] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    Promise.all([api.get('/products/'), api.get('/stock-in/'), api.get('/stock-out/')])
      .then(([pRes, siRes, soRes]) => {
        setProducts(pRes.data.results ?? pRes.data)
        setStockIns(siRes.data.results ?? siRes.data)
        setStockOuts(soRes.data.results ?? soRes.data)
      })
      .catch(() => setError('Could not load products.'))
  }

  useEffect(load, [])

  if (error) return <p className="text-red-600">{error}</p>
  if (!products) return <SkeletonCard />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Store Inventory</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/products/returns"
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:border-gray-300 hover:text-gray-900"
          >
            <ClipboardCheck size={15} />
            Returns Report
          </Link>
          <Link
            to="/products/list"
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700"
          >
            View Products
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <InventoryDashboard products={products} stockIns={stockIns} stockOuts={stockOuts} />
    </div>
  )
}

function InventoryDashboard({ products, stockIns, stockOuts }) {
  if (!stockIns || !stockOuts) {
    return (
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const totalProducts = products.length
  const totalUnits = products.reduce((sum, p) => sum + p.quantity_total, 0)
  const lowStockProducts = products.filter((p) => p.availability < p.reorder_threshold)
  const inStockCount = totalProducts - lowStockProducts.length
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  const latestUnitCost = {}
  ;[...stockIns]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((si) => { latestUnitCost[si.product] = Number(si.unit_cost) })

  const inventoryValue = products.reduce(
    (sum, p) => sum + p.quantity_total * (latestUnitCost[p.id] ?? 0), 0
  )

  const categoryTotals = {}
  products.forEach((p) => {
    const key = p.category || 'Uncategorized'
    categoryTotals[key] = (categoryTotals[key] ?? 0) + p.quantity_total
  })
  const categorySegments = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
  const topCategory = categorySegments[0]
  const highestValueProduct = products.reduce((top, p) => {
    const value = p.quantity_total * (latestUnitCost[p.id] ?? 0)
    return value > (top?.value ?? -1) ? { name: p.name, value } : top
  }, null)

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const stockReceivedByDay = last7Days.map((d) => {
    const key = d.toISOString().slice(0, 10)
    const total = stockIns.filter((si) => si.date === key).reduce((sum, si) => sum + si.quantity, 0)
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), value: total }
  })

  const productName = (id) => products.find((p) => p.id === id)?.name ?? `Product #${id}`
  const activity = [
    ...stockIns.map((si) => ({
      id: `in-${si.id}`, date: si.date, kind: 'in',
      text: `Stock In — ${si.quantity} x ${productName(si.product)}`,
      sub: si.supplier ? `From ${si.supplier}` : null,
    })),
    ...stockOuts.map((so) => ({
      id: `out-${so.id}`, date: so.date, kind: 'out',
      text: `Stock Out — ${so.quantity} x ${productName(so.product)}`,
      sub: so.returned ? 'Returned' : null,
    })),
  ]
    .sort((a, b) => (b.date === a.date ? 0 : new Date(b.date) - new Date(a.date)))
    .slice(0, 7)

  const inventoryHealth = totalProducts ? Math.round((inStockCount / totalProducts) * 100) : 100

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3">
          <StatCard icon={Boxes} color="bg-blue-500" label="Total Products" value={totalProducts} sub={`${totalUnits.toLocaleString()} units in stock`} />
          <StatCard icon={Layers} color="bg-purple-500" label="Categories" value={categories.length} sub={topCategory ? `Top: ${topCategory.label}` : '—'} />
          <StatCard icon={Wallet} color="bg-emerald-500" label="Inventory Value" value={inventoryValue} isCurrency sub="Based on latest stock-in cost" />
          <StatCard icon={AlertTriangle} color="bg-red-500" label="Low Stock" value={lowStockProducts.length} sub="Below reorder threshold" accent={lowStockProducts.length > 0} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Inventory by Category</h2>
              <p className="text-xs text-gray-500">Unit distribution across inventory</p>
            </div>
          </div>
          {categorySegments.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No stock recorded yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <DonutChart
                  segments={categorySegments}
                  centerValue={totalUnits.toLocaleString()}
                  centerLabel="Units"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  {categorySegments.slice(0, 5).map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 text-gray-700">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.label}</span>
                      </span>
                      <span className="shrink-0 font-medium text-gray-900">
                        {Math.round((s.value / totalUnits) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Top Category</p>
                  <p className="truncate text-sm font-bold text-gray-900">{topCategory?.label ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Categories</p>
                  <p className="text-sm font-bold text-gray-900">{categorySegments.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Highest Value</p>
                  <p className="truncate text-sm font-bold text-gray-900">{highestValueProduct?.name ?? '—'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-brand-600" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Stock Received</h2>
              <p className="text-xs text-gray-500">Last 7 days</p>
            </div>
          </div>
          <BarChart data={stockReceivedByDay} color="#084b9a" />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Stock Status</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">In Stock</span>
                <span className="text-gray-500">{inStockCount} products</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${totalProducts ? (inStockCount / totalProducts) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">Low Stock</span>
                <span className="text-gray-500">{lowStockProducts.length} products</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-500"
                  style={{ width: `${totalProducts ? (lowStockProducts.length / totalProducts) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Units</span>
              <span className="font-bold text-gray-900"><AnimatedNumber value={totalUnits} /></span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Inventory Health</span>
              <span className="font-bold text-green-600"><AnimatedNumber value={inventoryHealth} suffix="%" /></span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={15} className="text-brand-600" />
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${a.kind === 'in' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {a.kind === 'in' ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-gray-800">{a.text}</p>
                    <p className="text-[11px] text-gray-400">{a.sub ? `${a.sub} · ` : ''}{a.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, color, label, value, sub, isCurrency, accent }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${color}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-red-600' : 'text-gray-900'}`}>
        {isCurrency ? <AnimatedNumber value={value} prefix="$" decimals={0} /> : <AnimatedNumber value={value} />}
      </p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {sub && <p className="mt-1 truncate text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}
