const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/

export function normalizeEmailDomain(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase().replace(/^@/, "")
  if (!trimmed) return null
  return DOMAIN_PATTERN.test(trimmed) ? trimmed : null
}

export function parseAllowedEmailDomains(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => normalizeEmailDomain(item))
    .filter((domain): domain is string => domain !== null)
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
