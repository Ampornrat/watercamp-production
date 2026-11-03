import { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardList, Loader2, Save, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getTeamsForScoring, submitJudgeScores, getJudgeExistingScores } from '@/lib/contest-scoring.functions'

export const Route = createFileRoute('/contest-scoring')({
  head: () => ({ meta: [{ title: 'แบบฟอร์มให้คะแนนการประกวด' }] }),
  component: ContestScoringPage,
})

type Team = { id: string; team_name: string; campaign_name: string }
type ScoreEntry = { stem_score: string; content_score: string; presentation_score: string }

function ScoreInput({
  value, onChange, max, label,
}: { value: string; onChange: (v: string) => void; max: number; label: string }) {
  const num = parseFloat(value)
  const invalid = value !== '' && (isNaN(num) || num < 0 || num > max)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label} (0–{max})</span>
      <input
        type="number"
        min={0}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          invalid ? 'border-red-400 bg-red-50' : 'border-input bg-background'
        }`}
      />
    </div>
  )
}

function ContestScoringPage() {
  const getTeamsFn = useServerFn(getTeamsForScoring)
  const getExistingFn = useServerFn(getJudgeExistingScores)
  const submitFn = useServerFn(submitJudgeScores)

  const [judgeName, setJudgeName] = useState('')
  const [judgeEmail, setJudgeEmail] = useState('')
  const [judgeConfirmed, setJudgeConfirmed] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getTeamsFn().then((t) => {
      setTeams(t)
      const init: Record<string, ScoreEntry> = {}
      for (const team of t) init[team.id] = { stem_score: '', content_score: '', presentation_score: '' }
      setScores(init)
    })
  }, [])

  const handleConfirmJudge = async () => {
    if (!judgeName.trim()) { toast.error('กรุณากรอกชื่อกรรมการ'); return }
    if (!judgeEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(judgeEmail)) {
      toast.error('กรุณากรอกอีเมลที่ถูกต้อง'); return
    }
    setLoading(true)
    try {
      const existing = await getExistingFn({ data: { judge_email: judgeEmail } })
      if (existing.length > 0) {
        setScores((prev) => {
          const next = { ...prev }
          for (const e of existing) {
            next[e.team_id] = {
              stem_score: String(e.stem_score),
              content_score: String(e.content_score),
              presentation_score: String(e.presentation_score),
            }
          }
          return next
        })
        toast.info(`โหลดคะแนนที่บันทึกไว้แล้ว ${existing.length} ทีม`)
      }
      setJudgeConfirmed(true)
    } finally {
      setLoading(false)
    }
  }

  const setScore = (teamId: string, field: keyof ScoreEntry, val: string) => {
    setScores((prev) => ({ ...prev, [teamId]: { ...prev[teamId], [field]: val } }))
  }

  const getTotal = (s: ScoreEntry) => {
    const stem = parseFloat(s.stem_score) || 0
    const content = parseFloat(s.content_score) || 0
    const pres = parseFloat(s.presentation_score) || 0
    return (stem + content + pres).toFixed(1)
  }

  const submit = useMutation({
    mutationFn: async () => {
      const entries = []
      for (const team of teams) {
        const s = scores[team.id]
        if (!s) continue
        if (s.stem_score === '' || s.content_score === '' || s.presentation_score === '')
          throw new Error(`กรุณากรอกคะแนนให้ครบทุกช่องสำหรับทีม "${team.team_name}"`)
        const stem = parseFloat(s.stem_score)
        const content = parseFloat(s.content_score)
        const pres = parseFloat(s.presentation_score)
        if (isNaN(stem) || stem < 0 || stem > 35) throw new Error(`คะแนน STEM ของทีม "${team.team_name}" ต้องอยู่ระหว่าง 0–35`)
        if (isNaN(content) || content < 0 || content > 30) throw new Error(`คะแนนเนื้อหาของทีม "${team.team_name}" ต้องอยู่ระหว่าง 0–30`)
        if (isNaN(pres) || pres < 0 || pres > 35) throw new Error(`คะแนนเทคนิคของทีม "${team.team_name}" ต้องอยู่ระหว่าง 0–35`)
        entries.push({ team_id: team.id, stem_score: stem, content_score: content, presentation_score: pres })
      }
      await submitFn({ data: { judge_name: judgeName.trim(), judge_email: judgeEmail.trim().toLowerCase(), scores: entries } })
    },
    onSuccess: () => { setSubmitted(true); toast.success('บันทึกคะแนนเรียบร้อยแล้ว') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">บันทึกคะแนนเรียบร้อย</h1>
          <p className="mb-6 text-muted-foreground">ขอบคุณ {judgeName} ที่ให้คะแนนทีมทั้งหมด</p>
          <Link to="/contest-scoring-report">
            <Button variant="outline" className="gap-2"><BarChart3 className="h-4 w-4" /> ดูรายงานผลคะแนน</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><ClipboardList className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">แบบฟอร์มให้คะแนนการประกวด</h1>
                <p className="text-sm text-muted-foreground">ThaiWater Challenge — กรรมการตัดสิน</p>
              </div>
            </div>
            <Link to="/contest-scoring-report">
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <BarChart3 className="h-4 w-4" /> รายงานคะแนน
              </Button>
            </Link>
          </div>

          {/* Judge identity */}
          <Card className="mb-6 p-5">
            <h2 className="mb-4 font-semibold">ข้อมูลกรรมการ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>ชื่อ-นามสกุลกรรมการ *</Label>
                <Input
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  placeholder="เช่น รศ.ดร. สมชาย ใจดี"
                  disabled={judgeConfirmed}
                />
              </div>
              <div className="space-y-1.5">
                <Label>อีเมลกรรมการ *</Label>
                <Input
                  type="email"
                  value={judgeEmail}
                  onChange={(e) => setJudgeEmail(e.target.value)}
                  placeholder="judge@example.com"
                  disabled={judgeConfirmed}
                />
              </div>
            </div>
            {!judgeConfirmed && (
              <Button onClick={handleConfirmJudge} disabled={loading} className="mt-4 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                ยืนยันตัวตนและเริ่มให้คะแนน
              </Button>
            )}
            {judgeConfirmed && (
              <p className="mt-3 text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> ยืนยันแล้ว: <strong>{judgeName}</strong> ({judgeEmail})
              </p>
            )}
          </Card>

          {/* Scoring criteria legend */}
          <Card className="mb-6 p-4">
            <h2 className="mb-3 font-semibold">เกณฑ์การให้คะแนน (รวม 100 คะแนน)</h2>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              <div className="rounded-md bg-blue-50 p-3 text-center dark:bg-blue-950/30">
                <div className="text-2xl font-bold text-blue-600">35</div>
                <div className="font-medium">การประยุกต์ใช้ STEM</div>
              </div>
              <div className="rounded-md bg-teal-50 p-3 text-center dark:bg-teal-950/30">
                <div className="text-2xl font-bold text-teal-600">30</div>
                <div className="font-medium">เนื้อหา</div>
              </div>
              <div className="rounded-md bg-purple-50 p-3 text-center dark:bg-purple-950/30">
                <div className="text-2xl font-bold text-purple-600">35</div>
                <div className="font-medium">เทคนิคการนำเสนอ</div>
              </div>
            </div>
          </Card>

          {/* Score table */}
          {judgeConfirmed && (
            <>
              <Card className="mb-6 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">#</th>
                        <th className="px-4 py-3 text-left font-semibold">ชื่อทีม / แคมเปญ</th>
                        <th className="px-3 py-3 text-center font-semibold text-blue-600">STEM<br/><span className="font-normal text-xs">(0–35)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-teal-600">เนื้อหา<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-purple-600">เทคนิค<br/><span className="font-normal text-xs">(0–35)</span></th>
                        <th className="px-3 py-3 text-center font-semibold">รวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, i) => {
                        const s = scores[team.id] ?? { stem_score: '', content_score: '', presentation_score: '' }
                        const total = getTotal(s)
                        const filled = s.stem_score !== '' && s.content_score !== '' && s.presentation_score !== ''
                        return (
                          <tr key={team.id} className={`border-b transition-colors ${filled ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}>
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{team.team_name}</div>
                              <div className="text-xs text-muted-foreground">{team.campaign_name}</div>
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number" min={0} max={35} step={0.5}
                                value={s.stem_score}
                                onChange={(e) => setScore(team.id, 'stem_score', e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="—"
                              />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number" min={0} max={30} step={0.5}
                                value={s.content_score}
                                onChange={(e) => setScore(team.id, 'content_score', e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="—"
                              />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number" min={0} max={35} step={0.5}
                                value={s.presentation_score}
                                onChange={(e) => setScore(team.id, 'presentation_score', e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="—"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`font-bold text-base ${filled ? 'text-primary' : 'text-muted-foreground'}`}>
                                {filled ? total : '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={() => submit.mutate()}
                  disabled={submit.isPending}
                  size="lg"
                  className="gap-2 bg-primary font-bold"
                >
                  {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  บันทึกคะแนนทั้งหมด
                </Button>
              </div>
            </>
          )}

          {!judgeConfirmed && teams.length > 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>กรุณากรอกข้อมูลกรรมการและกด "ยืนยันตัวตน" เพื่อเริ่มให้คะแนน</p>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
