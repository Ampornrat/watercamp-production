import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSession } from '@/lib/auth.server'
import {
  getAdvisorByEmail,
  getAdvisorRegistrations,
  updateRegistrationApproval,
} from '@/lib/advisors.functions'
import { notifyApproval } from '@/lib/registration-notify.functions'

export const Route = createFileRoute('/advisor/dashboard')({
  beforeLoad: async () => {
    const user = await getSession()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: async ({ context }) => {
    const { user } = context as any
    const advisor = await getAdvisorByEmail({ data: { email: user.email } })
    const regs = advisor
      ? await getAdvisorRegistrations({ data: { institute_id: advisor.institute_id } })
      : []
    return { user, advisor, regs }
  },
  component: AdvisorDashboardPage,
})

function AdvisorDashboardPage() {
  const { user, advisor, regs: initialRegs } = Route.useLoaderData()
  const updateApprovalFn = useServerFn(updateRegistrationApproval)
  const notifyApprovalFn = useServerFn(notifyApproval)
  const qc = useQueryClient()
  const [regs, setRegs] = useState(initialRegs)
  const [pending, setPending] = useState<string | null>(null)

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    setPending(id)
    try {
      await updateApprovalFn({ data: { id, status } })
      setRegs((prev) => prev.map((r) => r.id === id ? { ...r, approval_status: status } : r))
      toast.success(status === 'approved' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธเรียบร้อย')
      notifyApprovalFn({ data: { registration_id: id, status } })
        .catch((err) => console.error('Failed to send approval email:', err?.message))
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />กลับหน้าแรก
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">ระบบอนุมัติของอาจารย์ที่ปรึกษา</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            อีเมลที่เข้าระบบ: <span className="font-medium text-foreground">{user.email}</span>
          </p>
          {advisor && (
            <p className="mt-1 text-sm text-muted-foreground">
              สถาบัน: <span className="font-medium text-foreground">{advisor.institute_name}</span>
            </p>
          )}
          {!advisor && (
            <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm text-foreground dark:border-amber-500/30 dark:bg-amber-950/30">
              อีเมลนี้ยังไม่ได้ลงทะเบียนเป็นอาจารย์ที่ปรึกษา —{' '}
              <Link to="/advisor/register" className="font-medium underline">ลงทะเบียนที่นี่</Link>
            </div>
          )}
        </div>

        <Card className="p-0">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">นักศึกษาในความดูแล ({regs.length})</h2>
          </div>

          {regs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              ยังไม่มีนักศึกษาที่ลงทะเบียนจากสถาบันนี้
            </div>
          ) : (
            <ul className="divide-y">
              {regs.map((r) => {
                const status = r.approval_status as 'pending' | 'approved' | 'rejected'
                const isPending = pending === r.id
                return (
                  <li key={r.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{r.guest_name || '—'}</span>
                        {status === 'pending' && <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />รออนุมัติ</Badge>}
                        {status === 'approved' && <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />อนุมัติแล้ว</Badge>}
                        {status === 'rejected' && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />ปฏิเสธ</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{r.guest_email}</div>
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">หลักสูตร:</span>{' '}
                        <span className="font-medium text-foreground">{r.training_title ?? '—'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ลงทะเบียน: {new Date(r.created_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                    {status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproval(r.id, 'approved')} disabled={isPending}>
                          อนุมัติ
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApproval(r.id, 'rejected')} disabled={isPending}>
                          ปฏิเสธ
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
      <SiteFooter />
    </div>
  )
}
