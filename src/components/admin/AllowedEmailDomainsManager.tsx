"use client"

import { useMemo, useState, useTransition } from "react"
import { useToast } from "@/components/shared/ToastProvider"

interface AllowedDomain {
  domain: string
  note?: string | null
}

function domainsToText(domains: AllowedDomain[]) {
  return domains.map((item) => item.domain).join("\n")
}

function textToDomains(value: string): AllowedDomain[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^@/, ""))
    .filter(Boolean)
    .map((domain) => ({ domain }))
}

export function AllowedEmailDomainsManager({
  initialDomains,
  currentUserEmail
}: {
  initialDomains: AllowedDomain[]
  currentUserEmail: string | null
}) {
  const { showToast } = useToast()
  const [text, setText] = useState(domainsToText(initialDomains))
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const previewDomains = useMemo(() => textToDomains(text), [text])
  const currentDomain = useMemo(() => {
    const at = currentUserEmail?.lastIndexOf("@") ?? -1
    if (!currentUserEmail || at < 0) return null
    return currentUserEmail.slice(at + 1).toLowerCase()
  }, [currentUserEmail])

  const wouldLockOut =
    previewDomains.length > 0 &&
    (!currentDomain || !previewDomains.some((item) => item.domain.toLowerCase() === currentDomain))

  async function save() {
    setError("")
    const response = await fetch("/api/allowed-email-domains", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domains: previewDomains })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "儲存允許網域失敗")
      return
    }
    startTransition(() => {
      showToast("Google 登入網域已更新", "success")
    })
  }

  return (
    <>
      <section className="panel">
        <h2>規則邏輯</h2>
        <p className="text-muted">
          清單留空時不限制 Google 登入網域；填入任一網域後，僅該清單內網域的 Google 帳號可登入，
          其他 Email 在 OAuth 完成後會被伺服器拒絕。
        </p>
        <p className="text-muted">
          清單恰好 1 個網域時，登入會自動帶入 Google 的 <code>hd</code> 參數， 帳號選擇器只顯示該
          Workspace 網域的帳號並預填 @{previewDomains[0]?.domain ?? "domain"}； 多網域時不帶{" "}
          <code>hd</code>（避免把其他合法網域也擋掉），但伺服器端仍會強制驗證。
        </p>
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
      </section>

      <section className="panel">
        <h2>允許登入網域</h2>
        <div className="field">
          <label>網域清單</label>
          <textarea
            rows={10}
            placeholder={"school.edu\nalumni.school.edu"}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <span className="hint">每行一個網域，不需 @，例如 school.edu。</span>
        </div>
        {wouldLockOut && (
          <p style={{ color: "#b42318", marginTop: 8 }}>
            目前清單不包含你登入的 Email 網域（{currentDomain ?? "未知"}），儲存後將無法重新登入。
            請先把自己的網域加入，或清空清單。
          </p>
        )}
      </section>

      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>目前設定</h2>
            <p className="text-muted">
              將儲存 {previewDomains.length} 個網域
              {previewDomains.length === 0 ? "（不限制）" : ""}。
            </p>
          </div>
          <button className="btn" type="button" disabled={isPending || wouldLockOut} onClick={save}>
            儲存網域
          </button>
        </div>
      </section>
    </>
  )
}
