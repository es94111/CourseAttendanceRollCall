"use client"

import { useMemo, useState, useTransition } from "react"
import { useToast } from "@/components/shared/ToastProvider"

type RuleAction = "allow" | "block"
type RuleTargetType = "country" | "ip" | "asn"

interface ConnectionAccessRule {
  id?: string
  action: RuleAction
  targetType: RuleTargetType
  value: string
  note?: string | null
  enabled: boolean
}

function rulesToText(
  rules: ConnectionAccessRule[],
  action: RuleAction,
  targetType: RuleTargetType
) {
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
  action: RuleAction,
  targetType: RuleTargetType
): ConnectionAccessRule[] {
  return lines(value).map((item) => ({ action, targetType, value: item, enabled: true }))
}

export function ConnectionAccessManager({
  initialRules
}: {
  initialRules: ConnectionAccessRule[]
}) {
  const { showToast } = useToast()
  const [allowCountries, setAllowCountries] = useState(
    rulesToText(initialRules, "allow", "country")
  )
  const [allowIps, setAllowIps] = useState(rulesToText(initialRules, "allow", "ip"))
  const [allowAsns, setAllowAsns] = useState(rulesToText(initialRules, "allow", "asn"))
  const [blockCountries, setBlockCountries] = useState(
    rulesToText(initialRules, "block", "country")
  )
  const [blockIps, setBlockIps] = useState(rulesToText(initialRules, "block", "ip"))
  const [blockAsns, setBlockAsns] = useState(rulesToText(initialRules, "block", "asn"))
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const previewRules = useMemo(
    () => [
      ...toRules(blockCountries, "block", "country"),
      ...toRules(blockIps, "block", "ip"),
      ...toRules(blockAsns, "block", "asn"),
      ...toRules(allowCountries, "allow", "country"),
      ...toRules(allowIps, "allow", "ip"),
      ...toRules(allowAsns, "allow", "asn")
    ],
    [allowAsns, allowCountries, allowIps, blockAsns, blockCountries, blockIps]
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
          封鎖規則優先套用；若允許清單有任何項目，只有符合允許國家、允許 IP 或允許 ASN
          的學生可完成點名。
        </p>
        <p className="text-muted">
          ASN 需設定 IPINFO_TOKEN 才能辨識；格式為 <code>AS</code> + 數字（例如 AS15169 代表
          Google）。
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
                placeholder={"203.0.113.10\n173.245.48.0/20\n2001:db8::1"}
                value={blockIps}
                onChange={(event) => setBlockIps(event.target.value)}
              />
              <span className="hint">每行一個 IPv4、IPv6 或 CIDR 網段。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label>封鎖 ASN</label>
              <textarea
                rows={8}
                placeholder={"AS13335\nAS15169"}
                value={blockAsns}
                onChange={(event) => setBlockAsns(event.target.value)}
              />
              <span className="hint">每行一個 ASN，可填 AS15169 或 15169。</span>
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
                placeholder={"198.51.100.8\n103.21.244.0/22\n2001:db8::2"}
                value={allowIps}
                onChange={(event) => setAllowIps(event.target.value)}
              />
              <span className="hint">可填 IPv4、IPv6 或 CIDR；留空表示不限制 IP。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label>允許 ASN</label>
              <textarea
                rows={8}
                placeholder={"AS3462\nAS9924"}
                value={allowAsns}
                onChange={(event) => setAllowAsns(event.target.value)}
              />
              <span className="hint">留空表示不限制 ASN。</span>
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
