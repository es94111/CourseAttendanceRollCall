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
  initialRules,
  initialIpShareLimit
}: {
  initialRules: ConnectionAccessRule[]
  initialIpShareLimit: number
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
              <label htmlFor="block-countries">封鎖國家代碼</label>
              <textarea
                rows={8}
                id="block-countries"
                placeholder={"CN\nRU"}
                value={blockCountries}
                onChange={(event) => setBlockCountries(event.target.value)}
              />
              <span className="hint">每行一個 2 碼國家代碼。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label htmlFor="block-ips">封鎖 IP</label>
              <textarea
                rows={8}
                id="block-ips"
                placeholder={"203.0.113.10\n173.245.48.0/20\n2001:db8::1"}
                value={blockIps}
                onChange={(event) => setBlockIps(event.target.value)}
              />
              <span className="hint">每行一個 IPv4、IPv6 或 CIDR 網段。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label htmlFor="block-asns">封鎖 ASN</label>
              <textarea
                rows={8}
                id="block-asns"
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
              <label htmlFor="allow-countries">允許國家代碼</label>
              <textarea
                rows={8}
                id="allow-countries"
                placeholder={"TW\nJP"}
                value={allowCountries}
                onChange={(event) => setAllowCountries(event.target.value)}
              />
              <span className="hint">留空表示不限制國家。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label htmlFor="allow-ips">允許 IP</label>
              <textarea
                rows={8}
                id="allow-ips"
                placeholder={"198.51.100.8\n103.21.244.0/22\n2001:db8::2"}
                value={allowIps}
                onChange={(event) => setAllowIps(event.target.value)}
              />
              <span className="hint">可填 IPv4、IPv6 或 CIDR；留空表示不限制 IP。</span>
            </div>
          </div>
          <div>
            <div className="field">
              <label htmlFor="allow-asns">允許 ASN</label>
              <textarea
                rows={8}
                id="allow-asns"
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

      <IpShareLimitForm initialValue={initialIpShareLimit} />
    </>
  )
}

function IpShareLimitForm({ initialValue }: { initialValue: number }) {
  const { showToast } = useToast()
  const [value, setValue] = useState(String(initialValue))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setError("")
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1000) {
      setError("請輸入 0 ~ 1000 的整數（0 表示關閉此防線）")
      return
    }
    setSaving(true)
    try {
      const response = await fetch("/api/system-settings/ip-share-limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsed })
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error ?? "儲存失敗")
        return
      }
      setValue(String(body.value))
      showToast("已儲存同 IP 簽到上限", "success")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel">
      <h2>同 IP 簽到上限</h2>
      <p className="text-muted">
        同一場點名 Session 內，當一個 IP 已為 N 位「不同」學生完成簽到後，後續來自同 IP
        的點名請求將被拒絕（HTTP 429），可防止學生把 QR 連結轉發給他人代簽。
      </p>
      <p className="text-muted">
        設為 <strong>0</strong> 表示關閉此防線（預設）。若多數學生使用行動數據（IP 不重疊），可設
        3~5；若教室共用 Wi-Fi NAT 出口同 IP，請依實際同時上線人數調高，否則會誤殺正常學生。
      </p>
      <div className="field" style={{ maxWidth: 240 }}>
        <label htmlFor="ip-share-limit">同 IP 簽到上限</label>
        <input
          id="ip-share-limit"
          type="number"
          min={0}
          max={1000}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <span className="hint">0 ~ 1000；0 = 關閉。</span>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      <div className="toolbar" style={{ marginTop: 12 }}>
        <button className="btn" type="button" disabled={saving} onClick={save}>
          儲存
        </button>
      </div>
    </section>
  )
}
