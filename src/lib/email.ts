export function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}
