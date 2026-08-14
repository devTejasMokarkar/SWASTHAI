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

const typeIcon: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'i',
}

const typeAccent: Record<Toast['type'], string> = {
  success: '#22c55e',
  error: '#D6409F',
  info: '#7C3AED',
}

export function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-[68px] right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[320px]">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-enter flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-semibold"
          style={{
            background: 'var(--surface, #fff)',
            border: `1px solid var(--border, #EAE4F7)`,
            boxShadow: '0 8px 24px rgba(124,58,237,0.12)',
            color: 'var(--text, #211935)',
          }}
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
            style={{ background: typeAccent[t.type] }}>
            {typeIcon[t.type]}
          </span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)}
            className="text-lg leading-none cursor-pointer shrink-0"
            style={{ color: 'var(--muted, #9A92B0)' }}>×</button>
        </div>
      ))}
    </div>
  )
}
