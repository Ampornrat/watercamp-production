import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Trophy, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSession } from '@/lib/auth.server'
import { getStudentProfile } from '@/lib/student-profile.functions'
import { getContestEligibleMembers, registerContestTeam } from '@/lib/contest.functions'

export const Route = createFileRoute('/contest/register')({
  component: ContestRegisterPage,
})

function ContestRegisterPage() {
  const navigate = useNavigate()
  const getSessionFn = useServerFn(getSession)
  const getProfileFn = useServerFn(getStudentProfile)
  const getEligibleFn = useServerFn(getContestEligibleMembers)
  const registerTeamFn = useServerFn(registerContestTeam)

  const [sessionUser, setSessionUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [teamName, setTeamName] = useState('')
  const [memberEmails, setMemberEmails] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [concept, setConcept] = useState('')

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
      .finally(() => setAuthLoading(false))
  }, [])

  const { data: eligible, isLoading: loadingEligible } = useQuery({
    queryKey: ['contest-eligible', profile?.institute_id],
    enabled: !!profile?.institute_id,
    queryFn: () => getEligibleFn({ data: { institute_id: profile.institute_id } }),
  })

  const memberCandidates = useMemo(
    () => (eligible ?? []).filter((e) => e.email !== sessionUser?.email),
    [eligible, sessionUser]
  )

  const toggleMember = (email: string) => {
    setMemberEmails((prev) =>
      prev.includes(email) ? prev.filter((x) => x !== email) : [...prev, email]
    )
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error('กรุณากรอกชื่อทีม')
      if (!profile?.institute_id) throw new Error('ไม่พบข้อมูลสถาบัน')
      if (!sessionUser?.email) throw new Error('ไม่พบข้อมูลผู้ใช้')
      if (memberEmails.length === 0) throw new Error('กรุณาเลือกสมาชิกทีมอย่างน้อย 1 คน')
      if (!campaignName.trim()) throw new Error('กรุณากรอกชื่อแคมเปญ')
      if (!concept.trim()) throw new Error('กรุณากรอกคอนเซป')

      const res = await registerTeamFn({
        data: {
          teamName: teamName.trim(),
          instituteId: profile.institute_id,
          leaderEmail: sessionUser.email,
          memberEmails,
          campaignName: campaignName.trim(),
          concept: concept.trim(),
        },
      })
      return res.id
    },
    onSuccess: () => {
      toast.success('ลงทะเบียนทีมเรียบร้อย พร้อมส่งผลงานได้แล้ว')
      navigate({ to: '/contest/submit' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (!sessionUser) return null

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/contest" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับไปกติกา
          </Link>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-teal/15 p-2 text-teal"><Users className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">ลงทะเบียนทีมส่งผลงาน</h1>
                <p className="text-sm text-muted-foreground">
                  สถาบัน: <strong>{profile?.institute_name ?? '—'}</strong>
                </p>
              </div>
            </div>

            {/* Leader info (read-only) */}
            <div className="mb-5 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">หัวหน้าทีม (ผู้ที่ login อยู่)</p>
              <p className="font-semibold">{profile?.full_name ?? sessionUser.email}</p>
              <p className="text-sm text-muted-foreground">{sessionUser.email}</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>ชื่อทีม *</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="เช่น Water Warriors"
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label>สมาชิกในทีม * (เลือกได้หลายคน)</Label>
                {loadingEligible ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายชื่อผู้มีสิทธิ์...
                  </div>
                ) : memberCandidates.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4">
                    <p className="text-sm text-muted-foreground">
                      ไม่พบสมาชิกที่ผ่านคุณสมบัติจากสถาบันนี้
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      สมาชิกต้องผ่านหลักสูตรที่กำหนดสำหรับการประกวดก่อน
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                    {memberCandidates.map((m) => (
                      <label
                        key={m.email}
                        className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={memberEmails.includes(m.email)}
                          onCheckedChange={() => toggleMember(m.email)}
                        />
                        <div className="text-sm">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ชื่อแคมเปญ *</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="เช่น ThaiWater รู้ทันฝน"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>คอนเซป (บรรยายพอสังเขป) *</Label>
                <Textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  rows={5}
                  maxLength={1500}
                  placeholder="อธิบายแนวคิดของแคมเปญ..."
                />
              </div>

              {/* Contest eligibility notice */}
              {eligible !== undefined && memberCandidates.length > 0 && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                  <Trophy className="mb-1 inline h-4 w-4" /> รายชื่อข้างต้นเป็นสมาชิกที่ผ่านคุณสมบัติการประกวดแล้ว
                </div>
              )}

              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="w-full bg-teal font-bold text-navy hover:bg-teal/90"
                size="lg"
              >
                {submit.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...</>
                ) : (
                  'ลงทะเบียนทีม'
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
