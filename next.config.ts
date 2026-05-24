import type { NextConfig } from "next"

const securityHeaders = [
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
      "./node_modules/pkg-types/**",
      "./node_modules/perfect-debounce/**",
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
