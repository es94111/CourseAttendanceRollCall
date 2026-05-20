export function parseAllowedEmailDomains(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean)
}

export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null
  const at = email.lastIndexOf("@")
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

export function isEmailDomainAllowed(email: string | null | undefined, allowed: string[]): boolean {
  if (allowed.length === 0) return true
  const domain = extractEmailDomain(email)
  return domain !== null && allowed.includes(domain)
}
