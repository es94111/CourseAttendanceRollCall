"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"
import { useToast } from "@/components/shared/ToastProvider"

interface UserRow {
  id: string
  email: string
  name: string | null
  role: "admin" | "student"
}

export function UserRoleManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [pendingChange, setPendingChange] = useState<{ user: UserRow; role: "admin" | "student" } | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.email.toLowerCase().includes(needle) ||
        (user.name ?? "").toLowerCase().includes(needle)
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      return matchesQuery && matchesRole
    })
  }, [query, roleFilter, users])

  async function updateRole() {
    if (!pendingChange) return
    setError("")
    const response = await fetch(`/api/users/${pendingChange.user.id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: pendingChange.role })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "角色更新失敗")
      return
    }
    showToast("使用者角色已更新", "success")
    setPendingChange(null)
    startTransition(() => router.refresh())
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <input placeholder="搜尋 Email 或姓名" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">全部角色</option>
          <option value="admin">admin</option>
          <option value="student">student</option>
        </select>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      {filteredUsers.length === 0 ? (
        <div className="empty-state">沒有符合條件的使用者</div>
      ) : (
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>姓名</th>
            <th>角色</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.name ?? "-"}</td>
              <td>
                <select
                  value={user.role}
                  disabled={isPending || user.id === currentUserId}
                  onChange={(event) => setPendingChange({ user, role: event.target.value as "admin" | "student" })}
                >
                  <option value="student">student</option>
                  <option value="admin">admin</option>
                </select>
                {user.id === currentUserId && <span style={{ marginLeft: 8 }}>不可修改自身</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
      <Dialog title="確認角色變更" open={pendingChange !== null} onClose={() => setPendingChange(null)}>
        <p>
          將 {pendingChange?.user.email} 的角色改為 {pendingChange?.role}。此操作會影響後台權限。
        </p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isPending} onClick={() => setPendingChange(null)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={updateRole}>
            確認變更
          </button>
        </div>
      </Dialog>
    </section>
  )
}
