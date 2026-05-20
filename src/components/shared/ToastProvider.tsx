"use client"

import { createContext, useContext, useMemo, useState } from "react"

type ToastKind = "success" | "error" | "info"

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ToastContext = createContext<{
  showToast: (message: string, kind?: ToastKind) => void
} | null>(null)

const ICON: Record<ToastKind, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

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
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            className={`toast ${toast.kind}`}
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            <div className="flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5">{ICON[toast.kind]}</span>
              <span className="flex-1">{toast.message}</span>
            </div>
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
