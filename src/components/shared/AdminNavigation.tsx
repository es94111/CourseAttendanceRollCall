"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SecureSignOutButton } from "@/components/shared/SecureSignOutButton"

type IconName = "home" | "book" | "students" | "users" | "shield" | "mail" | "history" | "archive"

interface NavItem {
  href: string
  label: string
  description: string
  icon: IconName
  relatedPrefixes?: string[]
  excludePrefixes?: string[]
}

const WORK_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "工作總覽", description: "今天的課程與點名", icon: "home" },
  {
    href: "/courses",
    label: "課程與點名",
    description: "課程、QR Code、統計",
    icon: "book",
    relatedPrefixes: ["/sessions", "/statistics"],
    excludePrefixes: ["/courses/archived"]
  },
  { href: "/students", label: "學生名冊", description: "學生資料與課程歸屬", icon: "students" }
]

const ADMIN_ITEMS: NavItem[] = [
  { href: "/users", label: "使用者權限", description: "管理角色與存取權", icon: "users" },
  { href: "/connection-access", label: "連線限制", description: "國家、IP 與 ASN", icon: "shield" },
  {
    href: "/allowed-email-domains",
    label: "登入網域",
    description: "Google 帳號範圍",
    icon: "mail"
  },
  { href: "/audit-logs", label: "稽核日誌", description: "系統操作紀錄", icon: "history" },
  { href: "/courses/archived", label: "封存課程", description: "唯讀歷史課程", icon: "archive" }
]

export function AdminNavigation({
  displayName,
  email
}: {
  displayName: string
  email: string | null
}) {
  const pathname = usePathname()
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "管"

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-inner">
        <Link href="/dashboard" className="admin-brand" aria-label="課程點名管理後台首頁">
          <span className="admin-brand-mark" aria-hidden>
            <CheckIcon />
          </span>
          <span>
            <strong>課程點名</strong>
            <small>管理後台</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="管理員主要導覽">
          <NavGroup label="日常工作" items={WORK_ITEMS} pathname={pathname} />
          <NavGroup label="系統管理" items={ADMIN_ITEMS} pathname={pathname} />
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar" aria-hidden>
            {initial}
          </span>
          <span className="admin-profile-copy">
            <strong>{displayName}</strong>
            <small>{email ?? "管理員帳號"}</small>
          </span>
          <SecureSignOutButton label="登出" className="admin-signout" style={undefined} />
        </div>
      </div>
    </aside>
  )
}

function NavGroup({
  label,
  items,
  pathname
}: {
  label: string
  items: NavItem[]
  pathname: string
}) {
  return (
    <div className="admin-nav-group">
      <p className="admin-nav-label">{label}</p>
      <div className="admin-nav-items">
        {items.map((item) => {
          const isExcluded = item.excludePrefixes?.some((prefix) => pathname.startsWith(prefix))
          const isActive =
            !isExcluded &&
            (pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)) ||
              item.relatedPrefixes?.some((prefix) => pathname.startsWith(prefix)))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="admin-nav-icon" aria-hidden>
                <NavIcon name={item.icon} />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  }

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    )
  }
  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </svg>
    )
  }
  if (name === "students" || name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.5M17 14.5a5 5 0 0 1 3.5 4.8" />
      </svg>
    )
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }
  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    )
  }
  if (name === "history") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M3 6h18M5 6l1 15h12l1-15M9 10h6M8 3h8l1 3H7z" />
    </svg>
  )
}
