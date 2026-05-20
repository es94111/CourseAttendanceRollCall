import type { Metadata } from "next"
import { ToastProvider } from "@/components/shared/ToastProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "課程點名系統",
  description: "Course Attendance Roll Call"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
