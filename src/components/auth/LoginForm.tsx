"use client"

import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"

type TurnstileRenderOptions = {
  sitekey: string
  callback?: (token: string) => void
  "error-callback"?: () => void
  "expired-callback"?: () => void
  "timeout-callback"?: () => void
  theme?: "light" | "dark" | "auto"
  action?: string
  appearance?: "always" | "execute" | "interaction-only"
  retry?: "auto" | "never"
  "retry-interval"?: number
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
      getResponse: (widgetId?: string) => string | undefined
    }
  }
}

export function LoginForm({
  action,
  turnstileSiteKey
}: {
  action: (formData: FormData) => Promise<void>
  turnstileSiteKey: string | null
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const requiresTurnstile = Boolean(turnstileSiteKey)
  const [tokenReady, setTokenReady] = useState(!requiresTurnstile)
  const [pendingSubmit, setPendingSubmit] = useState(false)

  const resetWidget = useCallback(() => {
    setTokenReady(false)
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
      } catch {
        // Cloudflare widget may already be torn down; safe to ignore.
      }
    }
  }, [])

  useEffect(() => {
    if (!turnstileSiteKey) return
    let cancelled = false

    const renderWidget = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        callback: () => setTokenReady(true),
        "error-callback": resetWidget,
        "expired-callback": resetWidget,
        action: "login",
        appearance: "always",
        retry: "auto",
        theme: "light"
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      const interval = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(interval)
          renderWidget()
        }
      }, 100)
      return () => {
        cancelled = true
        window.clearInterval(interval)
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // ignore
          }
          widgetIdRef.current = null
        }
      }
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
  }, [turnstileSiteKey, resetWidget])

  useEffect(() => {
    if (tokenReady && pendingSubmit && formRef.current) {
      setPendingSubmit(false)
      formRef.current.requestSubmit()
    }
  }, [tokenReady, pendingSubmit])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (requiresTurnstile && !tokenReady) {
      event.preventDefault()
      setPendingSubmit(true)
    }
  }

  const buttonLabel = pendingSubmit ? "機器人驗證中…" : "以 Google 帳號登入"

  return (
    <>
      {requiresTurnstile && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      )}
      <form ref={formRef} action={action} onSubmit={handleSubmit}>
        {requiresTurnstile && (
          <div
            ref={containerRef}
            style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}
          />
        )}
        <button
          className="btn"
          type="submit"
          disabled={pendingSubmit}
          style={{ width: "100%", minHeight: 44, fontSize: "0.9375rem" }}
        >
          {pendingSubmit ? (
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite"
              }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {buttonLabel}
        </button>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
