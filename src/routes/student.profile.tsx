import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, BookOpen, User, GraduationCap, Building2, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getStudentProfile } from '@/lib/student-profile.functions'

export const Route = createFileRoute('/student/profile')({
  component: StudentProfilePage,
})

function StudentProfilePage() {
  const search = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const emailFromUrl = search.get('email') ?? ''

  const [email, setEmail] = useState(emailFromUrl)
  const [submitted, setSubmitted] = useState(!!emailFromUrl)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const getProfileFn = useServerFn(getStudentProfile)

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setNotFound(false)
    setProfile(null)
    setSubmitted(true)
    try {
      const result = await getProfileFn({ data: { email: email.trim() } })
      if (result) setProfile(result)
      else setNotFound(true)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (emailFromUrl) handleSearch()
  }, [])

  const approvalLabel: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    approved: { label: 'อนุมัติแล้ว', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-green-600 hover:bg-green-600 text-white' },
    rejected: { label: 'ปฏิเสธ', icon: <XCircle className="h-3.5 w-3.5" />, color: 'bg-destructive hover:bg-destructive text-white' },
    pending:  { label: 'รออนุมัติ', icon: <Clock className="h-3.5 w-3.5" />, color: '' },
  }
  const completionLabel: Record<string, string> = {
    enrolled: 'กำลังเรียน',
    completed: 'ผ่านแล้ว',
    failed: 'ไม่ผ่าน',
  }

  const stats = profile ? {
    total: profile.registrations.length,
    approved: profile.registrations.filter((r: any) => r.approval_status === 'approved').length,
    completed: profile.registrations.filter((r: any) => r.completion_status === 'completed').length,
  } : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold md:text-3xl">ประวัติการเรียน</h1>
          <p className="mt-1 text-sm text-muted-foreground">ค้นหาประวัติการลงทะเบียนและผลการเรียนด้วยอีเมล</p>
        </div>

        <Card className="mb-6 p-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="email-input">อีเมลที่ใช้ลงทะเบียน</Label>
              <Input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </Button>
          </form>
        </Card>

        {submitted && !loading && notFound && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 p-4 text-sm text-foreground dark:border-amber-500/30 dark:bg-amber-950/30">
            ไม่พบข้อมูลสำหรับอีเมล <span className="font-medium">{email}</span> — กรุณาตรวจสอบอีเมลที่ใช้ลงทะเบียน
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Profile info */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" />ข้อมูลส่วนตัว
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div><span className="text-xs text-muted-foreground">ชื่อ-นามสกุล</span><p className="font-medium">{profile.full_name || '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">อีเมล</span><p className="font-medium">{profile.email}</p></div>
                <div><span className="text-xs text-muted-foreground">เพศ</span><p className="font-medium">{profile.gender || '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">อายุ</span><p className="font-medium">{profile.age ? `${profile.age} ปี` : '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">ระดับการศึกษา</span><p className="font-medium">{profile.education_level || '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">สาขา/วิชาเอก</span><p className="font-medium">{profile.field_of_study || '—'}</p></div>
                <div><span className="text-xs text-muted-foreground">สถานะผู้เข้าร่วม</span><p className="font-medium">{profile.participant_status || '—'}</p></div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />สถาบัน</span>
                  <p className="font-medium">{profile.institute_name || '—'}</p>
                </div>
              </div>
            </Card>

            {/* Stats */}
            {stats && (
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'หลักสูตรทั้งหมด', value: stats.total, icon: <BookOpen className="h-5 w-5 text-primary" /> },
                  { label: 'ได้รับการอนุมัติ', value: stats.approved, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
                  { label: 'ผ่านหลักสูตร', value: stats.completed, icon: <GraduationCap className="h-5 w-5 text-blue-600" /> },
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
            )}

            {/* Registration history */}
            <Card className="p-0">
              <div className="border-b px-6 py-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <BookOpen className="h-4 w-4 text-primary" />
                  ประวัติการลงทะเบียน ({profile.registrations.length})
                </h2>
              </div>
              {profile.registrations.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการลงทะเบียน</p>
              ) : (
                <ul className="divide-y">
                  {profile.registrations.map((r: any) => {
                    const ap = approvalLabel[r.approval_status] ?? approvalLabel.pending
                    const cs = completionLabel[r.completion_status] ?? r.completion_status
                    const isCompleted = r.completion_status === 'completed'
                    const isFailed = r.completion_status === 'failed'
                    return (
                      <li key={r.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{r.training_title}</span>
                            <Badge variant="outline" className="text-xs">{r.course_type === 'core' ? 'หลักสูตรหลัก' : 'เสริมทักษะ'}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            วันอบรม: {r.start_date ? new Date(r.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '—'}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            ลงทะเบียน: {new Date(r.created_at).toLocaleDateString('th-TH')}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`gap-1 ${ap.color}`} variant={r.approval_status === 'pending' ? 'outline' : 'default'}>
                            {ap.icon}{ap.label}
                          </Badge>
                          {r.approval_status === 'approved' && (
                            <Badge
                              className={isCompleted ? 'bg-blue-600 hover:bg-blue-600 text-white' : isFailed ? '' : ''}
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
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
