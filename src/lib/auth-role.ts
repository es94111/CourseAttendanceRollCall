import type { UserRole } from "@/types"

export function resolveSignInRole(
  email: string | null | undefined,
  existingRole: UserRole | null | undefined,
  adminEmails?: string
): UserRole {
  if (existingRole) return existingRole
  const normalized = email?.trim().toLowerCase()
  const admins = (adminEmails ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return normalized && admins.includes(normalized) ? "admin" : "student"
}
