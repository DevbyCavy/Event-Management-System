import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

export default function ProductSearchInput({ products, value, onSelect, onQueryChange, placeholder = 'Search products…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimeout = useRef(null)

  useEffect(() => {
    if (!value) {
      setQuery('')
      return
    }
    const selected = products.find((p) => String(p.id) === String(value))
    if (selected) setQuery(selected.name)
  }, [value, products])

  useEffect(() => {
    onQueryChange?.(query)
  }, [query])

  const matches = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : []

  const handleChange = (e) => {
    setQuery(e.target.value)
    setOpen(true)
    if (value) onSelect('')
  }

  const handleSelect = (product) => {
    onSelect(String(product.id))
    setQuery(product.name)
    setOpen(false)
  }

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => () => clearTimeout(blurTimeout.current), [])

  return (
    <div className="relative">
      <label className="relative block">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-8"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
        />
      </label>
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {matches.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">
              No matching products. Add Item will request "{query.trim()}" as a new product.
            </p>
          )}
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(p)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 hover:text-brand-700"
            >
              {p.name} <span className="text-gray-400">({p.availability} available)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
