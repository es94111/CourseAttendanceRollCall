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
        "error-callback": () => {
          setTokenReady(false)
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
        "expired-callback": () => {
          setTokenReady(false)
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
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
  }, [turnstileSiteKey])

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
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
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
