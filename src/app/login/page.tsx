import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { signIn } from "@/lib/auth"
import { LoginForm } from "@/components/auth/LoginForm"
import { prisma } from "@/lib/prisma"
import { getClientIpMetadata } from "@/lib/request-ip"
import { getTurnstileSiteKey, isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile"

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params?.error
  const turnstileEnabled = isTurnstileEnabled()
  const turnstileSiteKey = getTurnstileSiteKey()
  const allowedDomains = (
    await prisma.allowedEmailDomain.findMany({ orderBy: { domain: "asc" } })
  ).map((row) => row.domain)

  async function loginAction(formData: FormData) {
    "use server"
    if (isTurnstileEnabled()) {
      const tokenValue = formData.get("cf-turnstile-response")
      const token = typeof tokenValue === "string" ? tokenValue : null
      const { ipAddress } = getClientIpMetadata(await headers())
      const result = await verifyTurnstileToken(token, ipAddress)
      if (!result.success) {
        redirect("/login?error=turnstile-failed")
      }
    }
    const domains = await prisma.allowedEmailDomain.findMany({ select: { domain: true } })
    const authorizationParams = domains.length === 1 ? { hd: domains[0].domain } : undefined
    await signIn("google", { redirectTo: "/post-login" }, authorizationParams)
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10 bg-linear-to-b from-primary-50 via-paper to-paper">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-grid place-items-center w-10 h-10 rounded-xl bg-linear-to-br from-primary-600 to-primary-300 text-white shadow-card">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <span className="font-bold text-lg text-primary-900 tracking-tight">課程點名系統</span>
        </div>

        <section className="panel" style={{ marginTop: 0, padding: "28px 24px" }}>
          <div className="text-center mb-6">
            <h1 className="mb-2">歡迎回來</h1>
            <p className="text-muted" style={{ margin: 0 }}>
              {allowedDomains.length > 0
                ? `請使用 ${allowedDomains.map((domain) => `@${domain}`).join("、")} 的 Google 帳號登入`
                : "請使用 Google 帳號登入以繼續"}
            </p>
          </div>
          {error === "account-mismatch" && (
            <div className="status-card error">
              <strong>Google 帳號連結異常</strong>
              <p style={{ margin: 0 }}>系統已清除錯誤連結，請重新選擇正確的 Google 帳號登入。</p>
            </div>
          )}
          {error === "connection-blocked" && (
            <div className="status-card error">
              <strong>此連線來源已被封鎖</strong>
              <p style={{ margin: 0 }}>
                你的網路位置不在系統允許的範圍內，若有疑問請聯絡課程管理員。
              </p>
            </div>
          )}
          {error === "turnstile-failed" && (
            <div className="status-card error">
              <strong>機器人驗證未通過</strong>
              <p style={{ margin: 0 }}>請重新完成 Cloudflare 驗證後再試一次。</p>
            </div>
          )}
          {error === "domain-not-allowed" && (
            <div className="status-card error">
              <strong>不允許的 Google 網域</strong>
              <p style={{ margin: 0 }}>
                {allowedDomains.length > 0
                  ? `本系統僅允許 ${allowedDomains.map((domain) => `@${domain}`).join("、")} 的 Google 帳號登入，請改用授權網域登入。`
                  : "本系統限制 Google 網域，請聯絡管理員確認你的帳號可登入。"}
              </p>
            </div>
          )}

          <LoginForm
            action={loginAction}
            turnstileSiteKey={turnstileEnabled ? turnstileSiteKey : null}
          />

          <p
            className="text-muted"
            style={{ marginTop: 18, marginBottom: 0, fontSize: "0.8125rem", textAlign: "center" }}
          >
            登入即表示同意系統紀錄你的點名動作以供稽核。
          </p>
        </section>

        <p
          className="text-muted"
          style={{ marginTop: 16, fontSize: "0.8125rem", textAlign: "center" }}
        >
          僅限授權帳號使用 ‧ 如有問題請聯絡課程管理員
        </p>
      </div>
    </main>
  )
}
