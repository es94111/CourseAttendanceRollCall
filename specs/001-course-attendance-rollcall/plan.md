# 實作計畫：課程點名系統（Course Attendance Roll Call）

**分支**：`001-course-attendance-rollcall` | **日期**：2026-05-18 | **規格**：[spec.md](spec.md)

**輸入**：功能規格書來自 `/specs/001-course-attendance-rollcall/spec.md`

## 摘要

建立一套以 Next.js（App Router）為核心的全端課程點名系統，透過動態 HMAC QR Code 讓學生使用 Google OAuth 完成點名；管理員可管理課程、學生名單、請假記錄、出席統計，並以 CSV 格式匯出含 PII 警告的點名資料。即時更新（QR Code 輪換 + 統計刷新）透過 SSE 實現，資料庫採用 PostgreSQL + Prisma ORM，整體以 Docker 容器化部署。

---

## 技術背景（Technical Context）

**語言／版本**：TypeScript 6.x + Node.js 24 LTS（Next.js 16 要求）

**主要依賴**：
- `next`（最新版，App Router）
- `next-auth`（NextAuth.js v5）＋ `@auth/prisma-adapter`
- `@prisma/client` + `prisma`（PostgreSQL ORM）
- `qrcode`（QR Code 圖片生成）
- Node.js 內建 `crypto`（HMAC-SHA256 Token 簽名）
- `winston` + `winston-daily-rotate-file`（結構化 JSON 日誌 + log rotation）
- `csv-stringify`（CSV 匯出）
- `zod`（Server-side 資料驗證）
- `tailwindcss` + `shadcn/ui`（前端 UI 元件庫）

**資料庫**：PostgreSQL（最新版），透過 Prisma ORM 存取，Migrations 版本化管理

**測試框架**：Vitest + `@testing-library/react` + `supertest`（API 整合測試）

**目標平台**：
- 管理員端：桌面瀏覽器（Chrome/Firefox/Edge）
- 學生點名端：手機瀏覽器（iOS Safari / Android Chrome）
- 部署：Docker 容器（docker-compose 本地開發）、Zeabur 或雲端 VPS（正式環境）

**專案類型**：全端 Web 應用（Next.js App Router）

**效能目標**：
- QR Code 更新延遲 ≤ 1 秒（SC-003）
- 100 位學生於 15 秒內完成點名，無錯誤（SC-004）
- 統計資料在最後一筆點名後 5 秒內反映（SC-005）
- CSV 匯出（30,000 筆上限）目標回應時間 ≤ 30 秒（SC-006）
- 點名流程（掃描 QR Code → Google 登入 → 完成）≤ 30 秒（SC-002）

**約束條件**：
- 時區固定 UTC+8，不支援多時區
- QR Code 輪換與統計即時更新採 SSE（不使用 WebSocket 或 client polling）
- CSV 為唯一匯出格式（不引入 xlsx 依賴）
- JSON 結構化日誌寫入本機檔案（需 Docker Volume 掛載 + log rotation）
- 單次 CSV 匯出上限 30,000 筆（同步下載，不使用非同步背景工作）

**規模／範圍**：
- 單一課程學生上限：200 人
- 資料保留：至少 2 學年
- 多課程並行（無上限）
- 單一課程同一時間只能有一個 `active` Session

---

## 憲法檢查（Constitution Check）

*GATE：Phase 0 研究前必須通過；Phase 1 設計後再次確認。*

| 原則 | 狀態 | 備註 |
|------|------|------|
| I. 文件語言（繁體中文） | ✅ 通過 | 本文件以繁體中文撰寫；程式碼識別字使用英文 |
| II. 使用者優先設計 | ✅ 通過 | 規格書含 5 個 User Story，覆蓋管理員與學生視角 |
| III. 測試驅動開發 | ⚠️ 待執行 | tasks.md 必須確保測試先於實作（紅燈→綠燈→重構循環） |
| IV. 資料安全與隱私保護 | ✅ 通過 | RBAC（admin/student）、稽核日誌、PII 匯出警告、手動刪除個資機制 |
| V. 簡潔性（YAGNI） | ✅ 通過 | 所有功能對應已確認需求；無假設性功能 |

**Phase 1 設計後再次確認**：API 契約與資料模型不引入過度抽象層。

---

## 專案結構

### 文件（本功能）

```text
specs/001-course-attendance-rollcall/
├── plan.md              # 本文件（/speckit-plan 輸出）
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出
│   ├── api-routes.md    # API 端點契約
│   └── sse-events.md    # SSE 事件結構契約
└── tasks.md             # Phase 2 輸出（由 /speckit-tasks 產生）
```

### 原始碼（儲存庫根目錄）

```text
src/
├── app/
│   ├── (admin)/                     # 管理員路由群組（需 admin role）
│   │   ├── layout.tsx               # 管理員 Layout（授權檢查）
│   │   ├── dashboard/page.tsx       # 管理後台首頁
│   │   ├── courses/
│   │   │   ├── page.tsx             # 課程列表
│   │   │   ├── [id]/page.tsx        # 課程詳情（含學生個資刪除入口）
│   │   │   └── archived/page.tsx    # 封存課程列表
│   │   ├── sessions/
│   │   │   └── [id]/page.tsx        # 點名 Session（含 QR Code 顯示）
│   │   ├── statistics/
│   │   │   └── [courseId]/page.tsx  # 出席統計
│   │   ├── users/page.tsx           # 使用者角色管理（FR-005d）
│   │   └── audit-logs/page.tsx      # 稽核日誌查詢
│   ├── (student)/                   # 學生路由群組（需 student role）
│   │   ├── layout.tsx               # 學生 Layout（授權檢查）
│   │   └── my-attendance/page.tsx   # 個人出席記錄
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth.js handler
│   │   ├── courses/
│   │   │   ├── route.ts             # GET（列表）、POST（新增）
│   │   │   └── [id]/
│   │   │       ├── route.ts         # GET、PUT（編輯）、DELETE（封存）
│   │   │       ├── students/route.ts # GET（學生名單）、POST（加入學生）
│   │   │       ├── students/[studentId]/route.ts  # DELETE（移除）
│   │   │       ├── sessions/route.ts # GET（Session 列表）、POST（開啟新 Session）
│   │   │       ├── statistics/
│   │   │       │   ├── route.ts         # GET（出席統計）
│   │   │       │   └── stream/route.ts  # GET（SSE：統計即時推送，SC-005）
│   │   │       └── export/route.ts  # GET（CSV 匯出）
│   │   ├── sessions/
│   │   │   └── [id]/
│   │   │       ├── route.ts         # GET（Session 詳情）
│   │   │       ├── close/route.ts   # POST（手動關閉）
│   │   │       ├── void/route.ts    # POST（作廢）
│   │   │       ├── qrcode/route.ts  # GET（取得當前 QR Code Token）
│   │   │       └── stream/route.ts  # GET（SSE：QR Code 更新 + 統計推送）
│   │   ├── students/
│   │   │   ├── route.ts             # POST（手動新增單一學生）
│   │   │   ├── import/route.ts      # POST（CSV 批次匯入）
│   │   │   └── [id]/data/route.ts   # DELETE（學生個人資料刪除，FR-021c）
│   │   ├── attendance/
│   │   │   ├── route.ts             # POST（學生提交點名）
│   │   │   └── [id]/route.ts        # PUT（管理員手動補登／覆寫）
│   │   ├── leave/route.ts           # POST（新增請假記錄）
│   │   ├── users/
│   │   │   └── [id]/role/route.ts   # PUT（變更使用者角色）
│   │   └── audit-logs/route.ts      # GET（稽核日誌查詢）
│   ├── login/page.tsx               # 共用登入頁（Google OAuth）
│   ├── checkin/page.tsx             # QR Code 掃描後的點名頁（學生端）
│   └── layout.tsx                   # Root Layout
├── components/
│   ├── admin/
│   │   ├── CourseForm.tsx
│   │   ├── StudentImportDialog.tsx
│   │   ├── QRCodeDisplay.tsx        # QR Code 展示 + 倒數計時
│   │   ├── AttendanceTable.tsx
│   │   └── AuditLogTable.tsx
│   ├── student/
│   │   └── MyAttendanceTable.tsx
│   └── shared/
│       ├── DataTable.tsx
│       └── ConfirmDialog.tsx
├── lib/
│   ├── auth.ts                      # NextAuth.js 設定（含 ADMIN_EMAILS 白名單）
│   ├── prisma.ts                    # Prisma Client 單例
│   ├── qrcode.ts                    # QR Code 圖片生成（qrcode 套件）
│   ├── hmac.ts                      # HMAC Token 簽發與驗簽
│   ├── logger.ts                    # Winston 結構化 JSON 日誌
│   ├── csv.ts                       # CSV 匯出工具
│   ├── audit.ts                     # 稽核日誌寫入（雙軌：DB + 檔案）
│   └── attendance-stats.ts          # 出席率計算邏輯
└── types/
    └── index.ts                     # 共用型別定義

prisma/
├── schema.prisma                    # 資料庫 Schema（含 NextAuth 所需資料表）
└── migrations/                      # 版本化遷移腳本

tests/
├── unit/
│   ├── lib/hmac.test.ts
│   ├── lib/attendance-stats.test.ts
│   └── lib/csv.test.ts
├── integration/
│   ├── api/courses.test.ts
│   ├── api/sessions.test.ts
│   ├── api/attendance.test.ts
│   └── api/export.test.ts
└── contract/
    └── api-routes.test.ts           # API 契約測試

docker/
├── Dockerfile
└── docker-compose.yml

public/                              # 靜態資源

.env.example                         # 環境變數範本
```

**結構決策**：採用 Next.js App Router 單專案架構（Option 2 變形）。前後端合一，管理員路由群組與學生路由群組分別以 Layout 做授權隔離，API Routes 放在 `src/app/api/` 下，無需獨立的 backend 資料夾。

### 頁面渲染策略（TC-004 補充）

每頁的 SSR / CSR 邊界依互動性與資料依賴決定，原則如下：

| 路由                                       | 渲染策略           | 理由                                                                                                |
| ------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| `/login`                                   | SSR（Server）      | 無互動狀態，依 NextAuth Provider 配置直出，避免 client hydration 閃爍                                  |
| `/(admin)/dashboard`                       | SSR + 部分 CSR     | Layout 授權檢查於 Server；課程概覽資料以 Server Component 取得，操作按鈕為 Client Component             |
| `/(admin)/courses`                         | SSR + 部分 CSR     | 列表 SSR；新增/編輯 Dialog 與搜尋過濾為 Client                                                       |
| `/(admin)/courses/[id]`                    | SSR + 部分 CSR     | 課程基本資料 SSR；學生名單操作（CSV 匯入、個資刪除）為 Client                                         |
| `/(admin)/courses/archived`                | SSR                | 唯讀歷史資料，無互動                                                                                  |
| `/(admin)/sessions/[id]`                   | **CSR 為主**       | QRCodeDisplay 須訂閱 SSE 並每秒倒數，本質為 Client；初始 Session 資料以 RSC 取得後 hand-off            |
| `/(admin)/statistics/[courseId]`           | SSR + Client SSE   | 初始統計 SSR；訂閱 statistics/stream 部分為 Client                                                   |
| `/(admin)/users`                           | SSR + 部分 CSR     | 使用者清單 SSR；角色切換 Dropdown 為 Client                                                          |
| `/(admin)/audit-logs`                      | SSR + 部分 CSR     | 表格 SSR；篩選器為 Client                                                                            |
| `/(student)/my-attendance`                 | SSR                | 唯讀統計，無 SSE 訂閱需求                                                                             |
| `/checkin`                                 | **CSR 為主**       | 須讀取 URL query（token、sessionId）並執行 Google OAuth 跳轉與 POST，本質為 Client                    |

**SSG 不適用**：本系統所有頁面皆依登入態與資料庫狀態渲染，無靜態化效益。

---

## 複雜度追蹤

*僅在憲法檢查有違規且需要說明時填寫*

| 違規 | 原因 | 更簡單方案被拒絕的理由 |
|------|------|----------------------|
| 雙軌稽核日誌（DB + 檔案） | FR-024 明確要求同時寫入 | 單一媒介無法同時滿足管理介面查詢（需 DB）與 Docker Volume 持久化（需檔案）的需求 |
| SSE 而非 client polling | TC-005 明確約束 | 規格書禁止 polling 與 WebSocket，SSE 為唯一合規方案 |
| T061 統計 SSE 採伺服器端 2 秒輪詢 | TC-005 禁止 client polling，但 Next.js Route Handler 無法跨請求共用記憶體狀態，無法實作純事件驅動推送 | 純事件驅動（in-process pub/sub）不適用於 Next.js 無狀態 Route Handler；伺服器端 2 秒輪詢最差延遲 4 秒，符合 SC-005（5 秒）要求，不違反 TC-005（server-side polling ≠ client polling）|
