const DEFAULT_MAX_JSON_BYTES = 64 * 1024

export class RequestSecurityError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "RequestSecurityError"
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

function configuredOrigin() {
  const value = process.env.NEXTAUTH_URL?.trim() || process.env.AUTH_URL?.trim()
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function requestOriginFromHeaders(headers: Headers) {
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ?? firstHeaderValue(headers.get("host"))
  if (!host) return null

  const forwardedProto = firstHeaderValue(headers.get("x-forwarded-proto"))
  const protocol = forwardedProto ?? (process.env.NODE_ENV === "production" ? "https" : "http")
  if (protocol !== "http" && protocol !== "https") return null

  try {
    return new URL(`${protocol}://${host}`).origin
  } catch {
    return null
  }
}

/**
 * Validates browser request provenance without blocking trusted server-to-server
 * requests that do not carry browser Fetch Metadata or Origin headers.
 */
export function hasTrustedRequestOrigin(headers: Headers) {
  const fetchSite = headers.get("sec-fetch-site")?.toLowerCase()
  if (fetchSite === "cross-site") return false

  const origin = headers.get("origin")
  if (!origin) return true
  if (origin === "null") return false

  let normalizedOrigin: string
  try {
    normalizedOrigin = new URL(origin).origin
  } catch {
    return false
  }

  const expectedOrigin = configuredOrigin() ?? requestOriginFromHeaders(headers)
  return Boolean(expectedOrigin && normalizedOrigin === expectedOrigin)
}

function normalizedMediaType(contentType: string | null) {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? ""
}

function parseContentLength(request: Request) {
  const value = request.headers.get("content-length")
  if (value === null) return null
  if (!/^\d+$/.test(value)) {
    throw new RequestSecurityError("Content-Length 格式錯誤", 400)
  }
  return Number(value)
}

export async function readBoundedJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BYTES
): Promise<unknown> {
  const mediaType = normalizedMediaType(request.headers.get("content-type"))
  if (mediaType !== "application/json" && !mediaType.endsWith("+json")) {
    throw new RequestSecurityError("Content-Type 必須為 application/json", 415)
  }

  const contentLength = parseContentLength(request)
  if (contentLength !== null && contentLength > maxBytes) {
    throw new RequestSecurityError(`JSON 資料不得超過 ${maxBytes} bytes`, 413)
  }

  if (!request.body) {
    throw new RequestSecurityError("資料格式錯誤", 400)
  }

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new RequestSecurityError(`JSON 資料不得超過 ${maxBytes} bytes`, 413)
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()

  try {
    return JSON.parse(text)
  } catch {
    throw new RequestSecurityError("資料格式錯誤", 400)
  }
}

export function assertMultipartRequest(
  request: Request,
  maxBytes: number,
  requireContentLength = true
) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
  if (!contentType.startsWith("multipart/form-data;") || !contentType.includes("boundary=")) {
    throw new RequestSecurityError("Content-Type 必須為 multipart/form-data", 415)
  }

  const contentLength = parseContentLength(request)
  if (contentLength === null && requireContentLength) {
    throw new RequestSecurityError("上傳檔案時必須提供 Content-Length", 411)
  }
  if (contentLength !== null && contentLength > maxBytes) {
    throw new RequestSecurityError(`上傳資料不得超過 ${maxBytes} bytes`, 413)
  }
}
