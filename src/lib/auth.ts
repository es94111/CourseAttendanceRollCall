import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { extractEmailDomain } from "@/lib/auth-domain"
import { resolveSignInRole } from "@/lib/auth-role"
import { normalizeEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

async function loadAllowedEmailDomains(): Promise<string[]> {
  const rows = await prisma.allowedEmailDomain.findMany({ select: { domain: true } })
  return rows.map((row) => row.domain.toLowerCase())
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          max_age: "0"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const userEmail = normalizeEmail(user.email)
      const profileEmail = normalizeEmail(typeof profile?.email === "string" ? profile.email : null)
      if (!userEmail) return false
      if (account?.provider === "google" && profileEmail && profileEmail !== userEmail) {
        await prisma.account.deleteMany({
          where: {
            provider: account.provider,
            providerAccountId: account.providerAccountId
          }
        })
        return "/login?error=account-mismatch"
      }
      const allowedDomains = await loadAllowedEmailDomains()
      if (allowedDomains.length > 0) {
        const domain = extractEmailDomain(userEmail)
        if (!domain || !allowedDomains.includes(domain)) {
          if (account?.provider) {
            await prisma.account.deleteMany({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            })
          }
          return "/login?error=domain-not-allowed"
        }
      }
      const existing = await prisma.user.findUnique({ where: { email: userEmail } })
      const role = resolveSignInRole(userEmail, existing?.role ?? null, process.env.ADMIN_EMAILS)
      if (existing && existing.role !== role) {
        await prisma.user.update({ where: { id: existing.id }, data: { role } })
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    }
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return
      const role = resolveSignInRole(user.email, null, process.env.ADMIN_EMAILS)
      if (role !== user.role) {
        await prisma.user.update({ where: { id: user.id }, data: { role } })
      }
    }
  },
  pages: {
    signIn: "/login"
  }
})
