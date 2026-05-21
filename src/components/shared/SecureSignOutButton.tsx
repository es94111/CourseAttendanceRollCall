"use client"

import { useState } from "react"

export function SecureSignOutButton({
  label = "安全登出",
  className = "btn secondary",
  returnTo = "/login",
  style
}: {
  label?: string
  className?: string
  returnTo?: string
  style?: React.CSSProperties
}) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function secureSignOut() {
    setIsSigningOut(true)
    const target = resolveSameOriginTarget(returnTo)
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      // Storage may be blocked in some private browsing contexts.
    }
    await fetch("/api/auth/secure-signout", { method: "POST" })
    window.location.assign(target)
  }

  return (
    <button className={className} type="button" disabled={isSigningOut} onClick={secureSignOut} style={style}>
      {isSigningOut ? "登出中" : label}
    </button>
  )
}

function resolveSameOriginTarget(returnTo: string): string {
  const origin = window.location.origin
  const fallback = `${origin}/login`
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return fallback
  try {
    const url = new URL(returnTo, origin)
    return url.origin === origin ? url.toString() : fallback
  } catch {
    return fallback
  }
}
