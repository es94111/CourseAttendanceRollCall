import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { resolveSignInRole } from "@/lib/auth-role"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const existing = await prisma.user.findUnique({ where: { email: user.email } })
      const role = resolveSignInRole(user.email, existing?.role ?? null, process.env.ADMIN_EMAILS)
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
