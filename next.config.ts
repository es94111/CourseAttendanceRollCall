import type { NextConfig } from "next"

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'"
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  }
]

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**/*": [
      "./prisma/**/*",
      "./prisma.config.ts",
      "./node_modules/prisma/**",
      "./node_modules/@prisma/**",
      "./node_modules/effect/**",
      "./node_modules/c12/**",
      "./node_modules/empathic/**",
      "./node_modules/deepmerge-ts/**",
      "./node_modules/dotenv/**",
      "./node_modules/rc9/**",
      "./node_modules/defu/**",
      "./node_modules/jiti/**",
      "./node_modules/giget/**",
      "./node_modules/ohash/**",
      "./node_modules/pathe/**",
      "./node_modules/confbox/**",
      "./node_modules/exsolve/**",
      "./node_modules/chokidar/**",
      "./node_modules/readdirp/**",
      "./node_modules/pkg-types/**",
      "./node_modules/perfect-debounce/**",
      "./node_modules/destr/**",
      "./node_modules/fast-check/**",
      "./node_modules/pure-rand/**",
      "./node_modules/@standard-schema/spec/**"
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ]
  }
}

export default nextConfig
