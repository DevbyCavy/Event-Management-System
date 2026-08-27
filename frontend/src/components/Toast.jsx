import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)
const DURATION = 4000

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, type = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), DURATION)
  }, [dismiss])

  const toast = {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in pointer-events-auto relative w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <div className="flex items-start gap-2 p-3">
              {t.type === 'success' ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-600" />
              ) : (
                <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              )}
              <p className="flex-1 text-sm text-gray-800">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div
              className={`animate-toast-shrink h-1 ${t.type === 'success' ? 'bg-brand-500' : 'bg-red-500'}`}
              style={{ animationDuration: `${DURATION}ms` }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
