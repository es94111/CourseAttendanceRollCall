FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG QR_SECRET
ARG ADMIN_EMAILS
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV QR_SECRET=${QR_SECRET}
ENV ADMIN_EMAILS=${ADMIN_EMAILS}
ENV TZ=Asia/Taipei
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Isolated install: only prisma CLI + its transitive deps.
# Avoids missing modules (e.g. `effect`) when cherry-picking from the main node_modules.
FROM node:24-alpine AS prisma-cli
WORKDIR /prisma-cli
RUN apk add --no-cache jq
COPY package.json ./
RUN PRISMA_VERSION=$(jq -r '.devDependencies.prisma // .dependencies.prisma' package.json) \
 && echo "Installing prisma@${PRISMA_VERSION}" \
 && jq '{name:"prisma-cli-isolated",version:"0.0.0",private:true,overrides:.overrides}' package.json > isolated.json \
 && mv isolated.json package.json \
 && npm install --no-package-lock --no-fund --no-audit prisma@${PRISMA_VERSION}

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Asia/Taipei
# Pin base-image OpenSSL to the latest patched release from the Alpine repo
# (e.g. CVE-2026-14456 fixed in 3.5.8-r0) until node:24-alpine is rebuilt.
RUN apk add --no-cache libssl3 libcrypto3
# Global npm CLI is never invoked at runtime (CMD only runs `node server.js`,
# and startup-migrate.ts calls the prisma JS entrypoint directly), so drop it
# to remove its bundled deps from the image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma-cli/node_modules /app/.prisma-cli/node_modules
RUN mkdir -p logs && chown nextjs:nodejs logs
USER nextjs
EXPOSE 3000
# Migrations now run automatically via Next.js instrumentation hook (src/instrumentation.ts)
# on server boot, so no entrypoint shim is needed.
CMD ["node", "server.js"]
