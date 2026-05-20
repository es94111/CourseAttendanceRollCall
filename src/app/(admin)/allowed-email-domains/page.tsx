import { AllowedEmailDomainsManager } from "@/components/admin/AllowedEmailDomainsManager"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function AllowedEmailDomainsPage() {
  const session = await auth()
  const domains = await prisma.allowedEmailDomain.findMany({ orderBy: { domain: "asc" } })

  return (
    <main className="shell">
      <div className="page-heading">
        <div>
          <h1>Google 登入網域</h1>
          <p>限制只有指定 Email 網域的 Google 帳號可以登入系統。</p>
        </div>
      </div>
      <AllowedEmailDomainsManager
        initialDomains={domains.map(({ domain, note }) => ({ domain, note }))}
        currentUserEmail={session?.user?.email ?? null}
      />
    </main>
  )
}
