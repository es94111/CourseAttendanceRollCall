# Phase 0 研究報告：課程點名系統

**日期**：2026-05-18 | **功能**：課程點名系統（001-course-attendance-rollcall）

---

## 1. NextAuth.js v5 + Prisma Adapter 整合

**決策**：採用 NextAuth.js v5（`next-auth`）＋ `@auth/prisma-adapter`，以 Google OAuth Provider 為唯一登入方式。

**技術細節**：
- `@auth/prisma-adapter` 自動管理 `User`、`Account`、`Session`、`VerificationToken` 四張 NextAuth 所需資料表。
- `User` 表需額外新增 `role` 欄位（`admin` | `student`），可透過 Prisma Schema 擴充欄位後在 NextAuth callback 中讀取。
- 環境變數 `ADMIN_EMAILS`（逗號分隔）在 `signIn` callback 中讀取；若 Email 在白名單中，於首次登入時將 `role` 設為 `admin`，否則設為 `student`。
- Session 策略使用 `database`（資料庫 Session），與 Prisma Adapter 相容。

**替代方案評估**：
- **JWT Session**：無需 DB 查詢效能較佳，但 `role` 變更無法即時反映（需等 Session 過期），不符合即時角色管理需求（FR-005d）。
- **自訂 Auth**：開發成本過高，且缺乏社群維護，違反 YAGNI 原則。

**理由**：NextAuth.js 是 Next.js 生態系最成熟的認證方案，Prisma Adapter 與 TypeScript 型別整合完善，DB Session 確保角色變更即時生效。

---

## 2. HMAC QR Code Token 機制

**決策**：以 Node.js 內建 `crypto` 模組實作 HMAC-SHA256 簽名 Token，不引入第三方 JWT 函式庫。

**Token 結構**：
```
payload = `${sessionId}:${Math.floor(Date.now() / 15000)}` // 以 15 秒為單位的時間槽
signature = HMAC-SHA256(payload, QR_SECRET)
token = base64url(`${payload}.${signature}`)
```

**驗簽邏輯**：
1. 解碼 base64url → 拆分 payload 與 signature
2. 重新計算 `expected = HMAC-SHA256(payload, QR_SECRET)`
3. 時序安全比對（`crypto.timingSafeEqual`）
4. 從 payload 還原時間槽，驗證是否在當前或前一個 15 秒槽（處理邊界情況）
5. 再依 `grace_period_seconds` 判定寬限期：`token_issued_at + grace_period ≥ now`

**QR Code 圖片**：使用 `qrcode` npm 套件（`qrcode.toDataURL`），Server-side 產生 base64 PNG，透過 SSE 推送給前端；前端無需安裝額外套件。

**理由**：HMAC 無需持久化 Token（FR-008 明確要求），計算成本極低，驗簽 O(1)，符合 100 人並行點名（SC-004）需求。

---

## 3. SSE 在 Next.js App Router 中的實作

**決策**：使用 Next.js App Router Route Handler 的串流回應（`ReadableStream`）實作 SSE，搭配前端 `EventSource` API。

**Server 端實作模式**：
```typescript
// src/app/api/sessions/[id]/stream/route.ts
export async function GET(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const data = JSON.stringify({ type: 'qrcode_update', token: '...' })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }, 15000)
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

**兩個 SSE 端點**：
1. `GET /api/sessions/[id]/stream` — QR Code Token 每 15 秒推送（管理員畫面）
2. `GET /api/courses/[courseId]/statistics/stream` — 出席統計即時更新（統計頁面）

**前端實作**：
```typescript
const es = new EventSource(`/api/sessions/${sessionId}/stream`)
es.onmessage = (event) => { /* 更新 QR Code 圖片 */ }
```

**替代方案評估**：
- **WebSocket**：TC-005 明確禁止。
- **Client Polling**：TC-005 明確禁止。
- **React Server Components Streaming**：適合初始頁面渲染，不適合持續更新。

**理由**：SSE 為規格明確約束（TC-005），Next.js App Router 原生支援，無需額外函式庫，HTTP/1.1 相容性良好。

---

## 4. CSV 匯出效能設計

**決策**：使用 `csv-stringify` 串流模式（`stringify`）產生 CSV；同步回應，不使用背景 Worker。

**實作方式**：
- 使用 Prisma cursor-based pagination 分批讀取資料（每批 1,000 筆），避免一次載入 30,000 筆至記憶體。
- 透過 Node.js `Transform Stream` 將資料庫記錄即時轉換為 CSV 行。
- Response 使用 `ReadableStream` 串流回傳，TTFB（Time To First Byte）快，不等所有資料讀完才回應。
- 時間戳記一律轉換為 UTC+8 格式再寫入 CSV（TC-007）。

**效能預估**（30,000 筆，每筆 ~200 bytes）：
- 資料庫讀取：~2-5 秒（PostgreSQL，索引覆蓋查詢）
- CSV 產生：~1-2 秒
- 網路傳輸：~3-5 秒（CSV 約 6MB）
- 總計：目標 ≤ 30 秒（SC-006）✅

**上限強制**：API 計算總筆數後若超過 30,000，立即回傳 `400 Bad Request`，不執行匯出。

---

## 5. 結構化 JSON 日誌（Winston + log rotation）

**決策**：採用 `winston` 搭配 `winston-daily-rotate-file` 實現每日自動切割的 JSON 日誌。

**設定**：
```typescript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ssZ' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '90d',   // 保留 90 天
      maxSize: '100m',   // 單檔 100MB 上限
    })
  ]
})
```

**Docker Volume 掛載**（docker-compose.yml）：
```yaml
volumes:
  - ./logs:/app/logs
```

**日誌欄位**：`timestamp`、`level`、`message`、`requestPath`（可選）、`error`（可選）、`stack`（錯誤時）

---

## 6. 資料庫效能索引策略

**決策**：在高頻查詢路徑上建立複合索引。

**關鍵索引**：
- `AttendanceRecord(session_id, student_id)` — 唯一索引（防重複點名）
- `AttendanceSession(course_id, status)` — 篩選課程 active Session
- `Student(google_email)` — 唯一索引（FR-005）
- `Student(student_id)` — 唯一索引（FR-004）
- `AuditLog(event_type, created_at)` — 稽核日誌查詢
- `AttendanceRecord(session_id, attended_at)` — CSV 匯出排序

**UTC+8 儲存策略**：
- PostgreSQL 欄位型別使用 `TIMESTAMP WITH TIME ZONE`（Prisma `DateTime`）。
- 應用層在寫入前統一轉換為 UTC+8 偏移的 ISO 8601 字串；讀取後同樣轉換顯示。
- 或透過 `SET timezone = 'Asia/Taipei'` 設定 DB 連線時區。

---

## 7. Docker 部署架構

**決策**：本地開發使用 `docker-compose.yml`，正式環境部署至 Zeabur 或雲端 VPS（GCP / AWS / Hetzner）。

**docker-compose.yml 關鍵配置**：
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/rollcall
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      QR_SECRET: ${QR_SECRET}
      ADMIN_EMAILS: ${ADMIN_EMAILS}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
    volumes:
      - ./logs:/app/logs
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:latest
    environment:
      POSTGRES_DB: rollcall
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

**正式環境注意事項**：
- `NEXTAUTH_URL` 需設為正式域名（Google OAuth Callback URL 需在 Google Cloud Console 更新）。
- PostgreSQL 使用平台托管服務（如 Zeabur 的 PostgreSQL 插件）或獨立 VPS 容器。
- 確保 `logs/` Volume 在容器重啟後持久化。

---

## 8. 所有 NEEDS CLARIFICATION 已解決

規格書透過 Clarifications 章節已明確解答所有技術疑問，本 Phase 0 研究無殘留的「NEEDS CLARIFICATION」項目。

| 技術點 | 決策 | 規格依據 |
|--------|------|---------|
| 認證框架 | NextAuth.js v5 | TC-001、FR-005a |
| 資料庫 | PostgreSQL + Prisma | TC-002 |
| 即時更新機制 | SSE | TC-005 |
| QR Code 安全機制 | HMAC-SHA256 | FR-008 |
| 匯出格式 | CSV only | FR-021 |
| 日誌機制 | Winston JSON + rotation | TC-006 |
| 時區 | UTC+8 固定 | TC-007 |
| 部署 | Docker + Zeabur/VPS | TC-003 |
