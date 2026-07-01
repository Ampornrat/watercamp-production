import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Clock, ExternalLink, GraduationCap, LogOut, Trophy, User, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSession, logout } from '@/lib/auth.server'
import { confirmAttendance, getStudentProfile } from '@/lib/student-profile.functions'
import { toast } from 'sonner'

export const Route = createFileRoute('/student/dashboard')({
  component: StudentDashboardPage,
})

const approvalInfo: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  approved: { label: 'อนุมัติแล้ว', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-green-600 hover:bg-green-600 text-white' },
  rejected: { label: 'ปฏิเสธ', icon: <XCircle className="h-3.5 w-3.5" />, color: 'bg-destructive hover:bg-destructive text-white' },
  pending: { label: 'รออนุมัติ', icon: <Clock className="h-3.5 w-3.5" />, color: '' },
}
const completionInfo: Record<string, string> = {
  enrolled: 'กำลังเรียน',
  completed: 'ผ่านแล้ว',
  failed: 'ไม่ผ่าน',
}

function StudentDashboardPage() {
  const navigate = useNavigate()
  const getSessionFn = useServerFn(getSession)
  const logoutFn = useServerFn(logout)
  const getProfileFn = useServerFn(getStudentProfile)

  const confirmFn = useServerFn(confirmAttendance)

  const [sessionUser, setSessionUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    getSessionFn()
      .then((session) => {
        if (!session || session.role !== 'student') {
          navigate({ to: '/student/login' })
          return null
        }
        setSessionUser(session)
        return getProfileFn({ data: { email: session.email } })
      })
      .then((prof) => { if (prof) setProfile(prof) })
      .finally(() => setLoading(false))
  }, [])

  const handleConfirm = async (registrationId: string) => {
    if (!sessionUser?.email) return
    setConfirming(registrationId)
    try {
      await confirmFn({ data: { registration_id: registrationId, student_email: sessionUser.email } })
      toast.success('ยืนยันการเข้าเรียนแล้ว รอ admin ตรวจสอบ')
      setProfile((prev: any) => ({
        ...prev,
        registrations: prev.registrations.map((r: any) =>
          r.id === registrationId ? { ...r, self_confirmed_at: new Date().toISOString() } : r
        ),
      }))
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setConfirming(null)
    }
  }

  const handleLogout = async () => {
    await logoutFn()
    navigate({ to: '/' })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">กำลังโหลด...</div>
        <SiteFooter />
      </div>
    )
  }

  const regs = profile?.registrations ?? []
  const coreCompleted = regs.filter(
    (r: any) => r.course_type === 'core' && r.completion_status === 'completed'
  ).length
  const totalApproved = regs.filter((r: any) => r.approval_status === 'approved').length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">แดชบอร์ดนักเรียน</h1>
            <p className="mt-1 text-sm text-muted-foreground">{sessionUser?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0 gap-2">
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </Button>
        </div>

        {profile ? (
          <div className="space-y-6">
            {/* Profile info */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" /> ข้อมูลส่วนตัว
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <span className="text-xs text-muted-foreground">รหัสนักศึกษา</span>
                  <p className="font-medium">{profile.student_id || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ชื่อ-นามสกุล</span>
                  <p className="font-medium">{profile.full_name || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">สถาบัน</span>
                  <p className="font-medium">{profile.institute_name || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ระดับการศึกษา</span>
                  <p className="font-medium">{profile.education_level || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">สาขา/วิชาเอก</span>
                  <p className="font-medium">{profile.field_of_study || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">สถานะ</span>
                  <p className="font-medium">{profile.participant_status || '—'}</p>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'หลักสูตรทั้งหมด', value: regs.length, icon: <BookOpen className="h-5 w-5 text-primary" /> },
                { label: 'ได้รับการอนุมัติ', value: totalApproved, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
                { label: 'ผ่านหลักสูตรหลัก', value: coreCompleted, icon: <GraduationCap className="h-5 w-5 text-blue-600" /> },
              ].map((s) => (
                <Card key={s.label} className="flex items-center gap-4 p-5">
                  {s.icon}
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Contest eligibility */}
            {coreCompleted > 0 ? (
              <Card className="border-yellow-400/50 bg-yellow-50/50 p-5 dark:bg-yellow-950/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                      🏆 ท่านมีสิทธิ์ร่วมประกวด ThaiWater Challenge
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      ผ่านหลักสูตรหลักแล้ว {coreCompleted} หลักสูตร — สามารถสร้างทีมส่งผลงานได้
                    </p>
                  </div>
                  <Link to="/contest/register">
                    <Button size="sm" className="gap-2 bg-yellow-500 font-semibold text-white hover:bg-yellow-600">
                      <Trophy className="h-4 w-4" /> สมัครประกวด
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="border-dashed p-5">
                <p className="text-sm text-muted-foreground">
                  ⏳ ยังไม่มีสิทธิ์ประกวด — ต้องผ่านหลักสูตรหลัก (core) อย่างน้อย 1 หลักสูตรก่อน
                </p>
              </Card>
            )}

            {/* Registration history */}
            <Card className="p-0">
              <div className="border-b px-6 py-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <BookOpen className="h-4 w-4 text-primary" />
                  ประวัติการลงทะเบียน ({regs.length})
                </h2>
              </div>
              {regs.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการลงทะเบียน</p>
              ) : (
                <ul className="divide-y">
                  {regs.map((r: any) => {
                    const ap = approvalInfo[r.approval_status] ?? approvalInfo.pending
                    const cs = completionInfo[r.completion_status] ?? r.completion_status
                    const isCompleted = r.completion_status === 'completed'
                    const isFailed = r.completion_status === 'failed'
                    const now = new Date()
                    const startDate = r.session_start ? (r.session_start instanceof Date ? r.session_start : new Date(r.session_start)) : null
                    const endDate = r.session_end ? (r.session_end instanceof Date ? r.session_end : new Date(r.session_end)) : null
                    const hasStarted = startDate ? startDate <= now : false
                    const hasEnded = endDate && startDate && endDate > startDate ? endDate <= now : false
                    return (
                      <li key={r.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{r.training_title}</span>
                            <Badge variant="outline" className="text-xs">
                              {r.course_type === 'core' ? 'หลักสูตรหลัก' : 'เสริมทักษะ'}
                            </Badge>
                          </div>
                          {r.session_region && (
                            <div className="text-xs text-primary font-medium">{r.session_region}</div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            วันอบรม:{' '}
                            {startDate
                              ? startDate.toLocaleDateString('th-TH', { dateStyle: 'long' })
                              : '—'}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            ลงทะเบียน: {new Date(r.created_at).toLocaleDateString('th-TH')}
                          </div>
                          {r.online_url && r.approval_status === 'approved' && (
                            hasEnded ? null : hasStarted ? (
                              <a
                                href={r.online_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Link สำหรับเข้าเรียน Online
                              </a>
                            ) : (
                              <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Link จะเปิดให้เข้าเรียนเมื่อถึงวันและเวลาอบรม
                              </span>
                            )
                          )}
                          {r.approval_status === 'approved' && r.completion_status === 'enrolled' && !hasEnded && (
                            r.self_confirmed_at ? (
                              <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ยืนยันการเข้าเรียนแล้ว — รอ admin ตรวจสอบ
                              </span>
                            ) : hasStarted ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-1.5 h-7 gap-1 text-xs"
                                disabled={confirming === r.id}
                                onClick={() => handleConfirm(r.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {confirming === r.id ? 'กำลังบันทึก...' : 'ยืนยันการเข้าเรียน'}
                              </Button>
                            ) : startDate ? (
                              <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                ยืนยันได้เมื่อ{' '}
                                {startDate.toLocaleDateString('th-TH', { dateStyle: 'long' })}{' '}
                                {startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </span>
                            ) : null
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className={`gap-1 ${ap.color}`}
                            variant={r.approval_status === 'pending' ? 'outline' : 'default'}
                          >
                            {ap.icon}
                            {ap.label}
                          </Badge>
                          {r.approval_status === 'approved' && (
                            <Badge
                              className={isCompleted ? 'bg-blue-600 hover:bg-blue-600 text-white' : ''}
                              variant={isCompleted ? 'default' : isFailed ? 'destructive' : 'secondary'}
                            >
                              {cs}
                            </Badge>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        ) : (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">ไม่พบข้อมูลโปรไฟล์ กรุณาลงทะเบียนเรียนก่อน</p>
          </Card>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
