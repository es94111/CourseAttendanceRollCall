# 課程點名系統（Course Attendance Roll Call）

以 Next.js（App Router）打造的全端課程點名系統。管理員可建立課程、匯入學生名單、開啟動態 QR Code 點名 Session；學生使用 Google 帳號掃描 QR Code 完成點名。系統自動統計出席率，並支援含 PII 警告的 CSV 匯出與雙軌稽核日誌。

> **目前版本**：0.1.0（開發中）
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

| 變數 | 用途 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `NEXTAUTH_URL` | 應用程式對外網址（OAuth 回呼會使用） |
| `NEXTAUTH_SECRET` | NextAuth 簽章用密鑰（至少 32 字元） |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 憑證 |
| `QR_SECRET` | QR Code HMAC 簽章密鑰（至少 32 字元） |
| `ADMIN_EMAILS` | 初始管理員 Email 白名單（逗號分隔） |
| `TZ` | 應用程式時區，固定為 `Asia/Taipei` |

完整範本見 [.env.example](./.env.example)。

## 常用指令

```bash
npm run dev               # 啟動開發伺服器
npm run build             # 正式環境建置
npm run start             # 啟動正式版本
npm run lint              # 執行 ESLint
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

## 部署

正式環境推薦使用 [Zeabur](https://zeabur.com) 或雲端 VPS（GCP、AWS、Hetzner 等）。`docker/` 目錄提供 Dockerfile 與 `docker-compose.yml`，可直接打包部署。日誌檔案需掛載 Docker Volume 以確保容器重啟後持久化。

## 授權

本專案目前為內部開發，授權條款待定。
