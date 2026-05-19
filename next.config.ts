import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/**/*": [
      "./prisma/**/*",
      "./node_modules/prisma/build/**/*",
      "./node_modules/prisma/package.json",
      "./node_modules/@prisma/engines/**/*"
    ]
  }
}

export default nextConfig
