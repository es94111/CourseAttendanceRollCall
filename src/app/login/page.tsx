import { signIn } from "@/lib/auth"

export default function LoginPage() {
  return (
    <main className="shell" style={{ maxWidth: 520 }}>
      <h1>課程點名系統</h1>
      <p>請使用 Google 帳號登入。</p>
      <form
        action={async () => {
          "use server"
          await signIn("google", { redirectTo: "/dashboard" })
        }}
      >
        <button className="btn" type="submit">
          以 Google 帳號登入
        </button>
      </form>
    </main>
  )
}
