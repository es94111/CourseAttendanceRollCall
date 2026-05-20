"use client"

import { useMemo, useState, useTransition } from "react"
import { useToast } from "@/components/shared/ToastProvider"

interface ConnectionAccessRule {
  id?: string
  action: "allow" | "block"
  targetType: "country" | "ip"
  value: string
  note?: string | null
  enabled: boolean
}

function rulesToText(rules: ConnectionAccessRule[], action: "allow" | "block", targetType: "country" | "ip") {
  return rules
    .filter((rule) => rule.enabled && rule.action === action && rule.targetType === targetType)
    .map((rule) => rule.value)
    .join("\n")
}

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function toRules(
  value: string,
  action: "allow" | "block",
  targetType: "country" | "ip"
): ConnectionAccessRule[] {
  return lines(value).map((item) => ({ action, targetType, value: item, enabled: true }))
}

export function ConnectionAccessManager({ initialRules }: { initialRules: ConnectionAccessRule[] }) {
  const { showToast } = useToast()
  const [allowCountries, setAllowCountries] = useState(rulesToText(initialRules, "allow", "country"))
  const [allowIps, setAllowIps] = useState(rulesToText(initialRules, "allow", "ip"))
  const [blockCountries, setBlockCountries] = useState(rulesToText(initialRules, "block", "country"))
  const [blockIps, setBlockIps] = useState(rulesToText(initialRules, "block", "ip"))
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const previewRules = useMemo(
    () => [
      ...toRules(blockCountries, "block", "country"),
      ...toRules(blockIps, "block", "ip"),
      ...toRules(allowCountries, "allow", "country"),
      ...toRules(allowIps, "allow", "ip")
    ],
    [allowCountries, allowIps, blockCountries, blockIps]
  )

  async function save() {
    setError("")
    const response = await fetch("/api/connection-access", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: previewRules })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "儲存連線規則失敗")
      return
    }
    startTransition(() => {
      showToast("連線規則已更新", "success")
    })
  }

  return (
    <>
      <section className="panel">
        <h2>規則邏輯</h2>
        <p className="text-muted">
          封鎖規則優先套用；若允許清單有任何項目，只有符合允許國家或允許 IP 的學生可完成點名。
        </p>
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
      </section>

      <section className="panel">
        <h2>封鎖清單</h2>
        <div className="detail-grid">
          <div>
            <div className="field">
              <label>封鎖國家代碼</label>
              <textarea
                rows={8}
                placeholder={"CN\nRU"}
                value={blockCountries}
                onChange={(event) => setBlockCountries(event.target.value)}
              />
              <span className="hint">每行一個 2 碼國家代碼。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label>封鎖 IP</label>
              <textarea
                rows={8}
                placeholder={"203.0.113.10\n2001:db8::1"}
                value={blockIps}
                onChange={(event) => setBlockIps(event.target.value)}
              />
              <span className="hint">每行一個 IPv4 或 IPv6。</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>允許清單</h2>
        <div className="detail-grid">
          <div>
            <div className="field">
              <label>允許國家代碼</label>
              <textarea
                rows={8}
                placeholder={"TW\nJP"}
                value={allowCountries}
                onChange={(event) => setAllowCountries(event.target.value)}
              />
              <span className="hint">留空表示不限制國家。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label>允許 IP</label>
              <textarea
                rows={8}
                placeholder={"198.51.100.8\n2001:db8::2"}
                value={allowIps}
                onChange={(event) => setAllowIps(event.target.value)}
              />
              <span className="hint">留空表示不限制 IP。</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>目前設定</h2>
            <p className="text-muted">將儲存 {previewRules.length} 筆啟用規則。</p>
          </div>
          <button className="btn" type="button" disabled={isPending} onClick={save}>
            儲存規則
          </button>
        </div>
      </section>
    </>
  )
}
