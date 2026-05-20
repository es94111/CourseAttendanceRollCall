"use client"

import { signOut } from "next-auth/react"
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
    const target = new URL(returnTo, window.location.origin).toString()
    try {
      window.localStorage.clear()
      window.sessionStorage.clear()
    } catch {
      // Storage may be blocked in some private browsing contexts.
    }
    await signOut({ redirect: false })
    window.location.assign(target)
  }

  return (
    <button className={className} type="button" disabled={isSigningOut} onClick={secureSignOut} style={style}>
      {isSigningOut ? "登出中" : label}
    </button>
  )
}
