"use client"

import Script from "next/script"

export function TurnstileWidget({
  siteKey,
  theme = "light"
}: {
  siteKey: string
  theme?: "light" | "dark" | "auto"
}) {
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div
          className="cf-turnstile"
          data-sitekey={siteKey}
          data-theme={theme}
          data-action="login"
          data-appearance="always"
        />
      </div>
    </>
  )
}
