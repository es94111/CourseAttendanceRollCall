"use client"

import { createContext, useContext, useMemo, useState } from "react"

type ToastKind = "success" | "error" | "info"

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ToastContext = createContext<{ showToast: (message: string, kind?: ToastKind) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const value = useMemo(
    () => ({
      showToast(message: string, kind: ToastKind = "info") {
        const id = Date.now() + Math.random()
        setToasts((items) => [...items, { id, kind, message }])
        window.setTimeout(() => {
          setToasts((items) => items.filter((item) => item.id !== id))
        }, 3500)
      }
    }),
    []
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast ${toast.kind}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) return { showToast: () => undefined }
  return context
}
