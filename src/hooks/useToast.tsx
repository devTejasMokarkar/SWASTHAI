import { useState, useEffect, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0
let globalListeners: ((toast: Toast) => void)[] = []

export function showToast(message: string, type: Toast['type'] = 'info') {
  const toast: Toast = { id: `toast_${++toastId}`, message, type }
  globalListeners.forEach(fn => fn(toast))
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Toast) => {
    setToasts(prev => [...prev, t])
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id))
    }, 4000)
  }, [])

  useEffect(() => {
    globalListeners.push(addToast)
    return () => {
      globalListeners = globalListeners.filter(l => l !== addToast)
    }
  }, [addToast])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, dismiss }
}

const typeStyles: Record<Toast['type'], string> = {
  success: 'bg-emerald-600 border-emerald-400',
  error: 'bg-rose-600 border-rose-400',
  info: 'bg-primary border-primary/60',
}

export function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${typeStyles[t.type]} text-white px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center justify-between gap-3`}
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-white/70 hover:text-white text-lg leading-none cursor-pointer">×</button>
        </div>
      ))}
    </div>
  )
}
