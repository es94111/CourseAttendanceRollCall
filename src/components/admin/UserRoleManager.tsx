"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface UserRow {
  id: string
  email: string
  name: string | null
  role: "admin" | "student"
}

export function UserRoleManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  async function updateRole(userId: string, role: "admin" | "student") {
    setError("")
    const response = await fetch(`/api/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "角色更新失敗")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <section className="panel">
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>姓名</th>
            <th>角色</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.name ?? "-"}</td>
              <td>
                <select
                  value={user.role}
                  disabled={isPending || user.id === currentUserId}
                  onChange={(event) => updateRole(user.id, event.target.value as "admin" | "student")}
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
    </section>
  )
}
