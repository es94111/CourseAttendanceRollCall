# 快速上手指南：課程點名系統

**日期**：2026-05-18 | **功能**：001-course-attendance-rollcall

---

## 前置需求

| 工具 | 最低版本 | 說明 |
|------|---------|------|
| Docker Desktop | 4.x | 容器化本地開發環境 |
| Node.js | 20 LTS | 本地開發（選用，Docker 已包含） |
| pnpm | 9.x | 套件管理工具（或 npm/yarn 亦可） |
| Google Cloud Console 帳號 | — | 設定 OAuth 2.0 憑證 |

---

## 1. 複製專案

```bash
git clone <repository-url>
cd CourseAttendanceRollCall
```

---

## 2. 設定環境變數

複製範本並填入實際值：

```bash
cp .env.example .env.local
```

編輯 `.env.local`：

```env
# 資料庫（Docker Compose 本地開發）
DATABASE_URL="postgresql://postgres:password@localhost:5432/rollcall"

# NextAuth.js 設定
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-at-least-32-chars"

# Google OAuth（從 Google Cloud Console 取得）
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# QR Code HMAC 簽名密鑰（隨機字串，至少 32 字元）
QR_SECRET="your-qr-hmac-secret-at-least-32-chars"

# 初始管理員 Email 白名單（逗號分隔）
ADMIN_EMAILS="admin@school.edu,teacher@school.edu"
```

---

## 3. 設定 Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. 建立「OAuth 2.0 Client ID」，類型選「Web application」
3. 加入授權來源：`http://localhost:3000`
4. 加入 Callback URL：`http://localhost:3000/api/auth/callback/google`
5. 複製 Client ID 與 Client Secret 填入 `.env.local`

---

## 4. 啟動本地開發環境

### 方式 A：Docker Compose（推薦）

```bash
# 啟動 PostgreSQL + 應用程式
docker compose up -d

# 查看日誌
docker compose logs -f app

# 執行資料庫 Migration
docker compose exec app pnpm prisma migrate dev

# 停止環境
docker compose down
```

### 方式 B：僅 PostgreSQL 用 Docker，Next.js 本地執行

```bash
# 啟動 PostgreSQL
docker compose up -d db

# 安裝依賴
pnpm install

# 執行資料庫 Migration
pnpm prisma migrate dev

# 啟動 Next.js 開發伺服器
pnpm dev
```

---

## 5. 存取應用程式

| URL | 說明 |
|-----|------|
| `http://localhost:3000` | 根路由（自動導向登入頁） |
| `http://localhost:3000/login` | 共用登入頁（管理員與學生） |
| `http://localhost:3000/dashboard` | 管理後台首頁（需 admin role） |
| `http://localhost:3000/my-attendance` | 學生個人出席頁（需 student role） |

---

## 6. 初始管理員設定

1. 確認 `.env.local` 的 `ADMIN_EMAILS` 包含你的 Google Email
2. 開啟 `http://localhost:3000/login`
3. 點擊「以 Google 帳號登入」
4. 完成 Google OAuth 後，系統自動將你的帳號設為 `admin`
5. 跳轉至管理後台

---

## 7. 常用開發指令

```bash
# 執行測試
pnpm test

# 執行特定測試檔
pnpm vitest run tests/unit/lib/hmac.test.ts

# Prisma Studio（資料庫 GUI）
pnpm prisma studio

# 建立新 Migration
pnpm prisma migrate dev --name add_new_field

# 重置資料庫（清除所有資料並重新 migrate）
pnpm prisma migrate reset

# 型別檢查
pnpm tsc --noEmit

# 程式碼格式化
pnpm lint
```

---

## 8. 關鍵環境變數說明

| 變數 | 必填 | 說明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `NEXTAUTH_URL` | ✅ | 應用程式完整 URL（含 protocol，本地開發用 `http://localhost:3000`） |
| `NEXTAUTH_SECRET` | ✅ | NextAuth 加密密鑰（`openssl rand -base64 32`） |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth Client Secret |
| `QR_SECRET` | ✅ | HMAC QR Token 簽名密鑰（`openssl rand -base64 32`） |
| `ADMIN_EMAILS` | ✅ | 初始管理員 Email 白名單（逗號分隔） |

---

## 9. 正式環境部署（Zeabur）

1. 在 Zeabur 建立 PostgreSQL 服務，取得 `DATABASE_URL`
2. 在 Zeabur 建立 Next.js 服務，設定所有環境變數（含正式域名 `NEXTAUTH_URL`）
3. 在 Google Cloud Console 更新 OAuth Callback URL 為正式域名：
   `https://your-domain.com/api/auth/callback/google`
4. 確保 Zeabur Volume 掛載 `/app/logs` 以持久化日誌
5. 首次部署後執行 Migration：`npx prisma migrate deploy`

---

## 10. 日誌查看

```bash
# 查看應用程式日誌（Docker）
docker compose exec app tail -f logs/app-$(date +%Y-%m-%d).log

# 或直接在 Host 查看（Volume 掛載後）
tail -f ./logs/app-$(date +%Y-%m-%d).log
```

---

## 問題排解

**Q：Google OAuth 登入後出現錯誤**  
→ 確認 `NEXTAUTH_URL` 與 Google Console 中設定的 Callback URL 完全一致（包含 protocol 和 port）

**Q：QR Code 不顯示**  
→ 確認 `QR_SECRET` 已設定且長度 ≥ 32 字元；確認 AttendanceSession 狀態為 `active`

**Q：資料庫連線失敗**  
→ 確認 `docker compose up -d db` 已成功啟動；確認 `DATABASE_URL` 中的 host 在 Docker 內為 `db`（非 `localhost`）

**Q：管理員登入後看到學生頁面**  
→ 確認 `ADMIN_EMAILS` 包含你的 Google Email，且環境變數已在應用啟動前設定
