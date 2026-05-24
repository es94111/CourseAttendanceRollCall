import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { ToastProvider } from "@/components/shared/ToastProvider"
import { checkConnectionAccess } from "@/lib/connection-access"
import "./globals.css"

export const metadata: Metadata = {
  title: "課程點名系統",
  description: "Course Attendance Roll Call"
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488"
}

function BlockedPage({ reason }: { reason: string }) {
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10 bg-linear-to-b from-primary-50 via-paper to-paper">
      <section className="panel w-full max-w-md" style={{ marginTop: 0, padding: "28px 24px" }}>
        <div className="flex items-start gap-3">
          <span className="inline-grid place-items-center w-11 h-11 rounded-full bg-warning/15 text-[#92400e] shrink-0">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem" }}>連線已封鎖</h1>
            <p className="text-muted" style={{ margin: "8px 0 0" }}>
              {reason}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const access = await checkConnectionAccess(await headers())

  return (
    <html lang="zh-Hant">
      <body>
        <ToastProvider>{access.allowed ? children : <BlockedPage reason={access.reason ?? "此連線來源已被封鎖"} />}</ToastProvider>
      </body>
    </html>
  )
}
