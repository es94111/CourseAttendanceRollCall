import { signIn } from "@/lib/auth"

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams
  const error = params?.error
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10 bg-gradient-to-b from-primary-50 via-paper to-paper">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-300 text-white shadow-card">
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
              請使用 Google 帳號登入以繼續
            </p>
          </div>
          {error === "account-mismatch" && (
            <div className="status-card error">
              <strong>Google 帳號連結異常</strong>
              <p style={{ margin: 0 }}>系統已清除錯誤連結，請重新選擇正確的 Google 帳號登入。</p>
            </div>
          )}

          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <button
              className="btn"
              type="submit"
              style={{ width: "100%", minHeight: 44, fontSize: "0.9375rem" }}
            >
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
              以 Google 帳號登入
            </button>
          </form>

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
