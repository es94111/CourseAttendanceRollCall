import { AllowedEmailDomainsManager } from "@/components/admin/AllowedEmailDomainsManager"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"

export default async function AllowedEmailDomainsPage() {
  const session = await auth()
  const domains = await prisma.allowedEmailDomain.findMany({ orderBy: { domain: "asc" } })

  return (
    <main className="shell">
      <PageHeader
        eyebrow="系統管理"
        title="Google 登入網域"
        description="限制只有指定 Email 網域的 Google 帳號可以登入系統。"
      />
      <AllowedEmailDomainsManager
        initialDomains={domains.map(({ domain, note }) => ({ domain, note }))}
        currentUserEmail={session?.user?.email ?? null}
      />
    </main>
  )
}
