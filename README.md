# 課程點名系統（Course Attendance Roll Call）

以 Next.js（App Router）打造的全端課程點名系統。管理員可建立課程、匯入學生名單、開啟動態 QR Code 點名 Session；學生使用 Google 帳號掃描 QR Code 完成點名。系統自動統計出席率，並支援含 PII 警告的 CSV 匯出與雙軌稽核日誌。

> **目前版本**：0.7.5（開發中）
> **版本歷程**：[changelog.json](./changelog.json)
> **功能規格**：[specs/001-course-attendance-rollcall/spec.md](./specs/001-course-attendance-rollcall/spec.md)
> **實作計畫**：[specs/001-course-attendance-rollcall/plan.md](./specs/001-course-attendance-rollcall/plan.md)
> **專案憲法**：[.specify/memory/constitution.md](./.specify/memory/constitution.md)

## 核心功能

- **課程與名單管理**：管理員可新增／編輯／封存課程，並透過 CSV 批次匯入或手動逐筆新增學生資料。
- **動態 QR Code 點名**：每 15 秒輪換的 HMAC 簽名 QR Code，學生掃描後以 Google OAuth 完成點名。
- **角色制存取控制**：管理員與學生共用同一登入入口，依 `role` 欄位自動導向不同頁面。
- **遲到與請假管理**：可為每門課程設定遲到判定門檻，並手動新增請假記錄。
- **出席統計與 CSV 匯出**：自動計算出席率，含 PII 警告與稽核日誌的 CSV 匯出（單次上限 30,000 筆）。
- **稽核日誌**：所有敏感操作同時寫入資料庫與結構化 JSON 檔案，並提供後台查詢頁。

## 技術堆疊

| 類別 | 選用 |
|------|------|
| 全端框架 | Next.js（App Router）+ TypeScript |
| 身份驗證 | NextAuth.js（Google OAuth） |
| 資料庫 | PostgreSQL + Prisma ORM |
| 即時推送 | Server-Sent Events（SSE） |
| UI | Tailwind CSS + shadcn/ui |
| 測試 | Vitest + Testing Library + supertest |
| 程式碼檢查與排版 | Biome |
| 日誌 | Winston（每日輪轉的結構化 JSON 檔案） |
| 部署 | Docker（本地 docker-compose；正式環境 Zeabur 或雲端 VPS） |

## 快速開始

### 必要環境

- Node.js 20 LTS 以上
- PostgreSQL（建議透過 Docker 啟動）
- Google Cloud Console 取得的 OAuth 2.0 Client ID／Secret

### 初次設定

```bash
# 1. 安裝套件
npm install

# 2. 複製環境變數範本並填入實際值
cp .env.example .env

# 3. 套用資料庫遷移
npm run prisma:migrate

# 4. 啟動開發伺服器
npm run dev
```

開啟瀏覽器 [http://localhost:3000](http://localhost:3000) 即可進入登入頁。

### 環境變數

| 變數 | 必填 | 用途 | 範例／說明 |
|------|:----:|------|------------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 | `postgresql://user:pass@host:5432/rollcall?schema=public` |
| `NEXTAUTH_URL` | ✅ | 應用程式對外網址，Auth.js 用來組裝 OAuth callback URL | 開發 `http://localhost:3000`；正式 `https://attendance.example.edu` |
| `NEXTAUTH_SECRET` | ✅ | NextAuth Session／JWT 簽章密鑰，**至少 32 字元** | 產生方式：`openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 Client ID | 從 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 取得 |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth 2.0 Client Secret | 同上 |
| `QR_SECRET` | ✅ | QR Code HMAC 簽章密鑰，**至少 32 字元**，獨立於 `NEXTAUTH_SECRET` | 產生方式：`openssl rand -base64 48` |
| `ADMIN_EMAILS` | ✅ | 首次登入即指派為管理員的 Email 白名單，逗號分隔 | `admin@school.edu,dept@school.edu` |
| `TZ` | 建議 | 應用程式時區，固定為 `Asia/Taipei` | 預設由 Dockerfile 設好 |
| `AUTH_TRUST_HOST` | 選填 | 反向代理後若需顯式信任 host，可設 `true`；本專案已在 `src/lib/auth.ts` 設 `trustHost: true`，通常不需另外設定 | `true` |

完整範本見 [.env.example](./.env.example)。

> ⚠️ **安全提醒**：`NEXTAUTH_SECRET`、`QR_SECRET`、`GOOGLE_CLIENT_SECRET` 切勿提交至 Git，部署時透過 CI Secrets 或部署平台環境變數注入。

## 常用指令

```bash
npm run dev               # 啟動開發伺服器
npm run build             # 正式環境建置
npm run start             # 啟動正式版本
npm run lint              # 執行 Biome 檢查
npm run format            # 自動排版程式碼
npm run check             # 檢查 + 排版檢查（CI 使用）
npm run test              # 執行 Vitest 全部測試
npm run test:watch        # 監看模式
npm run prisma:generate   # 重新產生 Prisma Client
npm run prisma:migrate    # 套用資料庫遷移（開發環境）
```

## 專案結構

```
src/
├── app/
│   ├── (admin)/        # 管理員路由群組（dashboard、courses、sessions、statistics、users、audit-logs）
│   ├── (student)/      # 學生路由群組（my-attendance）
│   ├── api/            # API Routes（courses、sessions、attendance、students、users、leave、audit-logs）
│   ├── checkin/        # 學生掃描 QR Code 後的點名頁
│   ├── login/          # 共用登入頁
│   └── layout.tsx
├── components/         # 管理員／學生／共用 UI 元件
├── lib/                # auth、prisma、qrcode、hmac、csv、logger、audit、attendance-stats 等核心邏輯
└── types/
prisma/
├── schema.prisma
└── migrations/
tests/                  # unit / integration / contract
docker/                 # Dockerfile 與 docker-compose
specs/                  # Spec-Driven Development 文件
.specify/               # 憲法、模板、擴充腳本
```

## 開發流程

本專案採用 [Spec-Driven Development](.specify/memory/constitution.md)，新功能依序執行：

```
/speckit-specify → /speckit-clarify（視需要） → /speckit-plan → /speckit-tasks → /speckit-implement
```

所有規格、計畫、任務文件 MUST 以繁體中文撰寫；程式碼識別字使用英文。詳細規範見 [.specify/memory/constitution.md](./.specify/memory/constitution.md)。

## Docker 部署

`docker/` 目錄提供多階段 `Dockerfile` 與本地用的 `docker-compose.yml`，可直接打包部署。

### 架構說明

- **多階段建置**：`deps`（裝套件）→ `builder`（`prisma generate` + `next build`）→ `runner`（執行階段，僅保留 standalone 產物與 Prisma CLI）
- **Next.js standalone output**：image 體積最小化，runner 不含 source code
- **啟動時自動 migrate**：容器 ENTRYPOINT 會先執行 `prisma migrate deploy`，再啟動 `node server.js`。schema 過舊時容器會啟動失敗，避免在不一致狀態下提供服務
- **日誌持久化**：應用程式 winston logs 寫入 `/app/logs`，需掛載 Volume 才能跨容器重啟保留

### 方法一：本地 docker-compose（開發／測試）

`docker/docker-compose.yml` 已含 PostgreSQL 與應用程式服務，最快上手方式：

```bash
# 1. 在專案根目錄建立 .env，填入下列至少 4 個密鑰
#    NEXTAUTH_SECRET、GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、QR_SECRET、ADMIN_EMAILS
cp .env.example .env  # 編輯後填入實際值

# 2. 啟動
docker compose -f docker/docker-compose.yml up --build

# 3. 開啟 http://localhost:3000
```

compose 內建：
- PostgreSQL 18（資料持久化於 named volume `postgres_data`）
- `depends_on` healthcheck，DB ready 後才啟動 app
- App 啟動時自動跑 migrations，**首次啟動即可直接登入使用**

### 方法二：自建 image 部署到 VPS／雲端

適用於 Zeabur、Fly.io、GCP Cloud Run、AWS ECS、Hetzner VPS 等。

#### 1. 在 Google Cloud Console 設定 OAuth Client

到 [Credentials](https://console.cloud.google.com/apis/credentials) 編輯 OAuth 2.0 Client：

- **Authorized JavaScript origins**：加入 `https://你的網域`
- **Authorized redirect URIs**：加入 `https://你的網域/api/auth/callback/google`

> URI 必須完全一致：`https`（不是 http）、無尾斜線、大小寫一致。每個環境（prod／staging）都要各自加一筆。

#### 2. 建置 image

```bash
docker build \
  -f docker/Dockerfile \
  -t ghcr.io/<owner>/course-attendance-rollcall:latest \
  .
```

> Build args（`DATABASE_URL` 等）僅在 build 階段需要，runner 階段透過部署平台的環境變數注入即可。建置時可傳入 CI 假值（如 `.github/workflows/docker-ci.yml` 的設定），因為 `prisma generate` 與 `next build` 不需要實際連線資料庫。

#### 3. 部署到目標平台

在部署平台設定以下執行時環境變數（必填皆需設定，缺一容器就無法啟動）：

```env
DATABASE_URL=postgresql://user:pass@db-host:5432/rollcall
NEXTAUTH_URL=https://你的網域
NEXTAUTH_SECRET=<openssl rand -base64 48>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
QR_SECRET=<openssl rand -base64 48>
ADMIN_EMAILS=admin@school.edu
TZ=Asia/Taipei
```

> **反向代理（Nginx／Caddy／Cloudflare）**：本專案在 `src/lib/auth.ts` 已設 `trustHost: true`，反代後仍可正確解析 host。如另有特殊環境，可再加 `AUTH_TRUST_HOST=true`。

#### 4. 日誌持久化（選用）

掛載 `/app/logs` 以保留稽核日誌的 JSON 檔案：

```bash
docker run -d \
  --name rollcall \
  --env-file .env.production \
  -v /var/log/rollcall:/app/logs \
  -p 3000:3000 \
  ghcr.io/<owner>/course-attendance-rollcall:latest
```

### 方法三：CI/CD 自動建置與推送

`.github/workflows/docker-ci.yml` 已設定：
- PR／push 觸發測試與 typecheck
- push 至任意分支或 tag `v*` 時建置並推送到 GHCR；若設定了 `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` Secret，會同步推送到 Docker Hub
- Image tags：`branch name`、`sha-<commit>`、`latest`（僅 default branch）、`v*` tags

需在 GitHub Repo Settings → Secrets 設定（選填）：
- `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`：若要推送至 Docker Hub

### 資料持久化

本專案有**兩種需要持久化的資料**，部署時務必確認都有正確掛載，否則容器重啟即遺失。

#### 1. PostgreSQL 資料庫（主要資料）

存放：使用者、課程、學生名單、點名 Session、出席記錄、請假、稽核日誌等所有業務資料。應用容器本身不存業務資料，只透過 `DATABASE_URL` 連 DB；即使 app pod 整個重建，資料仍在 DB 端。

| 部署方式 | 持久化路徑 |
|---------|-----------|
| 本地 `docker-compose.yml` | named volume `postgres_data` → 容器內 `/var/lib/postgresql/data` |
| Zeabur 內建 PostgreSQL 服務 | 由 Zeabur 自動掛載 PVC，無需手動設定 |
| 自管 VPS | 自行掛載 host 目錄，例如 `-v /data/rollcall-pg:/var/lib/postgresql/data` |
| 外部 DB（Supabase／Neon／RDS 等） | 依該服務的備份／持久化機制 |

#### 2. 應用程式日誌檔（稽核雙軌之一）

`src/lib/logger.ts` 透過 winston-daily-rotate-file 寫入 **容器內 `/app/logs/`**：

- 檔名：`logs/app-YYYY-MM-DD.log`
- 每日輪轉、單檔上限 100MB、保留 90 天
- 同樣內容也寫入資料庫 `AuditLog` 表，但檔案軌跡為「應用程式無法刪除」的可驗證來源，建議保留

| 部署方式 | 設定方式 |
|---------|---------|
| 本地 `docker-compose.yml` | 已 bind mount `../logs:/app/logs`（專案根目錄的 `logs/`） |
| Zeabur | Dashboard → Service → **Volumes** → Add Volume，Mount path 填 `/app/logs`，大小建議 ≥ 1 GB |
| 自管 VPS | `docker run -v /var/log/rollcall:/app/logs ...` |

> ⚠️ **Zeabur 注意**：容器檔案系統是 ephemeral，未掛 Volume 時每次 redeploy 都會清空 `/app/logs/`，雖然 `AuditLog` 表仍保留資料，但失去檔案軌跡。建議部署時就把 `/app/logs` Volume 加上。

### 常見問題

| 錯誤訊息 | 原因 | 解法 |
|---------|------|------|
| `UntrustedHost: Host must be trusted` | Auth.js 不信任請求的 host（多發生於反向代理後） | 確認 `src/lib/auth.ts` 內 `trustHost: true` 已啟用；或設環境變數 `AUTH_TRUST_HOST=true` |
| `redirect_uri_mismatch` (Google 400) | Google OAuth Client 未登記實際 callback URL | 到 Google Cloud Console 新增 `https://<host>/api/auth/callback/google` |
| `The table public.accounts does not exist` | 資料庫從未跑過 migration | 確認容器使用最新 image（已內建啟動時 migrate）；或手動執行 `DATABASE_URL=... npx prisma migrate deploy` |
| `Server error: There is a problem with the server configuration` | NextAuth 必填環境變數缺失（最常見 `NEXTAUTH_SECRET`） | 檢查所有必填變數，重啟容器 |
| 容器啟動後立即退出，log 顯示 `P1001` | runner 無法連線 `DATABASE_URL` | 檢查 DB host／port／防火牆／DB 是否 healthy |
| 重新部署後稽核日誌檔案不見 | `/app/logs` 未掛 Volume | 依上方「資料持久化 §2」加掛 Volume |

## 授權

本專案目前為內部開發，授權條款待定。
