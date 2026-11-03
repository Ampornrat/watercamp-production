import { useState, useEffect, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardList, Loader2, Save, BarChart3, CloudOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getTeamsForScoring, submitJudgeScores, getJudgeExistingScores } from '@/lib/contest-scoring.functions'

export const Route = createFileRoute('/contest-scoring')({
  head: () => ({ meta: [{ title: 'แบบฟอร์มให้คะแนนการประกวด' }] }),
  component: ContestScoringPage,
})

type Team = { id: string; team_name: string; campaign_name: string }
type ScoreEntry = { stem_score: string; content_score: string; presentation_score: string }

const LIMITS = { stem_score: 35, content_score: 30, presentation_score: 35 } as const

function isFieldInvalid(value: string, max: number): boolean {
  if (value === '') return false
  const n = parseFloat(value)
  return isNaN(n) || n < 0 || n > max || !Number.isFinite(n)
}

function isRowComplete(s: ScoreEntry): boolean {
  return s.stem_score !== '' && s.content_score !== '' && s.presentation_score !== ''
}

function isRowValid(s: ScoreEntry): boolean {
  return isRowComplete(s) &&
    !isFieldInvalid(s.stem_score, 35) &&
    !isFieldInvalid(s.content_score, 30) &&
    !isFieldInvalid(s.presentation_score, 35)
}

function clampOnBlur(value: string, max: number, onChange: (v: string) => void) {
  if (value === '') return
  const n = parseFloat(value)
  if (!isNaN(n)) {
    const clamped = Math.min(Math.max(0, n), max)
    if (clamped !== n) onChange(String(clamped))
  }
}

function localKey(email: string) {
  return `contest-draft-${email.toLowerCase()}`
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
  const [savedTeams, setSavedTeams] = useState<Set<string>>(new Set())   // saved to server
  const [dirtyTeams, setDirtyTeams] = useState<Set<string>>(new Set())   // changed since last server save
  const [savingTeam, setSavingTeam] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getTeamsFn().then((t) => {
      setTeams(t)
      setScores((prev) => {
        const init: Record<string, ScoreEntry> = {}
        for (const team of t) init[team.id] = prev[team.id] ?? { stem_score: '', content_score: '', presentation_score: '' }
        return init
      })
    })
  }, [])

  // Auto-save to localStorage whenever scores change (after confirmed)
  useEffect(() => {
    if (!judgeConfirmed || !judgeEmail) return
    try {
      localStorage.setItem(localKey(judgeEmail), JSON.stringify({ judgeName, scores }))
    } catch {}
  }, [scores, judgeConfirmed, judgeEmail, judgeName])

  const handleConfirmJudge = async () => {
    if (!judgeName.trim()) { toast.error('กรุณากรอกชื่อกรรมการ'); return }
    if (!judgeEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(judgeEmail)) {
      toast.error('กรุณากรอกอีเมลที่ถูกต้อง'); return
    }
    setLoading(true)
    try {
      // Load from localStorage first (fastest feedback)
      const email = judgeEmail.trim().toLowerCase()
      const cached = localStorage.getItem(localKey(email))
      if (cached) {
        try {
          const { scores: cachedScores } = JSON.parse(cached)
          if (cachedScores) {
            setScores((prev) => {
              const next = { ...prev }
              for (const [id, val] of Object.entries(cachedScores)) next[id] = val as ScoreEntry
              return next
            })
          }
        } catch {}
      }

      // Then load from server (authoritative — overwrites local for saved teams)
      const existing = await getExistingFn({ data: { judge_email: email } })
      if (existing.length > 0) {
        const serverSaved = new Set<string>()
        setScores((prev) => {
          const next = { ...prev }
          for (const e of existing) {
            next[e.team_id] = {
              stem_score: String(e.stem_score),
              content_score: String(e.content_score),
              presentation_score: String(e.presentation_score),
            }
            serverSaved.add(e.team_id)
          }
          return next
        })
        setSavedTeams(serverSaved)
        toast.info(`โหลดคะแนนที่บันทึกไว้แล้ว ${existing.length} ทีม`)
      } else if (cached) {
        toast.info('โหลด Draft จากเครื่องแล้ว (ยังไม่ได้บันทึกขึ้น server)')
      }

      setJudgeConfirmed(true)
    } finally {
      setLoading(false)
    }
  }

  const setScore = useCallback((teamId: string, field: keyof ScoreEntry, val: string) => {
    setScores((prev) => ({ ...prev, [teamId]: { ...prev[teamId], [field]: val } }))
    setDirtyTeams((prev) => new Set(prev).add(teamId))
    setSavedTeams((prev) => { const next = new Set(prev); next.delete(teamId); return next })
  }, [])

  const getTotal = (s: ScoreEntry) => {
    const stem = parseFloat(s.stem_score) || 0
    const content = parseFloat(s.content_score) || 0
    const pres = parseFloat(s.presentation_score) || 0
    return (stem + content + pres).toFixed(1)
  }

  // Save draft for a single team
  const handleSaveTeam = async (teamId: string) => {
    const s = scores[teamId]
    if (!s || !isRowValid(s)) {
      toast.error('กรุณากรอกคะแนนให้ครบและถูกต้องก่อนบันทึก')
      return
    }
    setSavingTeam(teamId)
    try {
      await submitFn({
        data: {
          judge_name: judgeName.trim(),
          judge_email: judgeEmail.trim().toLowerCase(),
          scores: [{
            team_id: teamId,
            stem_score: parseFloat(s.stem_score),
            content_score: parseFloat(s.content_score),
            presentation_score: parseFloat(s.presentation_score),
          }],
        },
      })
      setSavedTeams((prev) => new Set(prev).add(teamId))
      setDirtyTeams((prev) => { const next = new Set(prev); next.delete(teamId); return next })
      toast.success('บันทึก Draft แล้ว')
    } catch (e: any) {
      toast.error(e?.message ?? 'บันทึกไม่สำเร็จ')
    } finally {
      setSavingTeam(null)
    }
  }

  const invalidFields = teams.flatMap((team) => {
    const s = scores[team.id]
    if (!s) return []
    return (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).filter(
      (field) => isFieldInvalid(s[field], LIMITS[field])
    ).map((field) => ({ team: team.team_name, field }))
  })
  const hasErrors = invalidFields.length > 0

  const completedCount = teams.filter((t) => isRowValid(scores[t.id] ?? { stem_score: '', content_score: '', presentation_score: '' })).length
  const allComplete = completedCount === teams.length && teams.length > 0

  const submitAll = useMutation({
    mutationFn: async () => {
      const entries = []
      for (const team of teams) {
        const s = scores[team.id]
        if (!s || !isRowComplete(s))
          throw new Error(`กรุณากรอกคะแนนให้ครบทุกทีม (ยังขาดทีม "${team.team_name}")`)
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
    onSuccess: () => {
      try { localStorage.removeItem(localKey(judgeEmail.toLowerCase())) } catch {}
      setSubmitted(true)
      toast.success('บันทึกคะแนนทั้งหมดเรียบร้อยแล้ว')
    },
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
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> ยืนยันแล้ว: <strong>{judgeName}</strong> ({judgeEmail})
                </p>
                <Badge variant="secondary" className="text-xs">
                  บันทึกแล้ว {savedTeams.size}/{teams.length} ทีม
                </Badge>
              </div>
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
                <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    กรอกคะแนนทีละทีมแล้วกด <strong>"บันทึก Draft"</strong> เพื่อบันทึกทีละรายการ
                    หรือกรอกทั้งหมดแล้วกด <strong>"บันทึกทั้งหมด"</strong>
                  </p>
                  <span className="shrink-0 text-sm font-semibold text-primary ml-4">
                    {completedCount}/{teams.length} ทีม
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-8">#</th>
                        <th className="px-4 py-3 text-left font-semibold">ชื่อทีม / แคมเปญ</th>
                        <th className="px-3 py-3 text-center font-semibold text-blue-600">STEM<br/><span className="font-normal text-xs">(0–35)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-teal-600">เนื้อหา<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-purple-600">เทคนิค<br/><span className="font-normal text-xs">(0–35)</span></th>
                        <th className="px-3 py-3 text-center font-semibold">รวม</th>
                        <th className="px-3 py-3 text-center font-semibold">Draft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, i) => {
                        const s = scores[team.id] ?? { stem_score: '', content_score: '', presentation_score: '' }
                        const stemErr = isFieldInvalid(s.stem_score, 35)
                        const contentErr = isFieldInvalid(s.content_score, 30)
                        const presErr = isFieldInvalid(s.presentation_score, 35)
                        const rowHasError = stemErr || contentErr || presErr
                        const rowSaved = savedTeams.has(team.id)
                        const rowDirty = dirtyTeams.has(team.id)
                        const rowComplete = isRowValid(s)
                        const isSaving = savingTeam === team.id

                        let rowBg = ''
                        if (rowHasError) rowBg = 'bg-red-50/40 dark:bg-red-950/10'
                        else if (rowSaved && !rowDirty) rowBg = 'bg-green-50/60 dark:bg-green-950/15'
                        else if (rowComplete) rowBg = 'bg-blue-50/40 dark:bg-blue-950/10'

                        return (
                          <tr key={team.id} className={`border-b transition-colors ${rowBg}`}>
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{team.team_name}</div>
                              <div className="text-xs text-muted-foreground">{team.campaign_name}</div>
                              {rowSaved && !rowDirty && (
                                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3" /> บันทึกแล้ว
                                </span>
                              )}
                              {rowDirty && rowComplete && (
                                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                                  <CloudOff className="h-3 w-3" /> ยังไม่ได้บันทึก
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number" min={0} max={35} step={0.5}
                                value={s.stem_score}
                                onChange={(e) => setScore(team.id, 'stem_score', e.target.value)}
                                onBlur={(e) => clampOnBlur(e.target.value, 35, (v) => setScore(team.id, 'stem_score', v))}
                                className={`w-full rounded-md border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 ${stemErr ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400/50' : 'border-input bg-background focus:ring-primary/50'}`}
                                placeholder="—"
                              />
                              {stemErr && <p className="mt-0.5 text-center text-xs text-red-600">0–35</p>}
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number" min={0} max={30} step={0.5}
                                value={s.content_score}
                                onChange={(e) => setScore(team.id, 'content_score', e.target.value)}
                                onBlur={(e) => clampOnBlur(e.target.value, 30, (v) => setScore(team.id, 'content_score', v))}
                                className={`w-full rounded-md border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 ${contentErr ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400/50' : 'border-input bg-background focus:ring-primary/50'}`}
                                placeholder="—"
                              />
                              {contentErr && <p className="mt-0.5 text-center text-xs text-red-600">0–30</p>}
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input
                                type="number" min={0} max={35} step={0.5}
                                value={s.presentation_score}
                                onChange={(e) => setScore(team.id, 'presentation_score', e.target.value)}
                                onBlur={(e) => clampOnBlur(e.target.value, 35, (v) => setScore(team.id, 'presentation_score', v))}
                                className={`w-full rounded-md border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 ${presErr ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400/50' : 'border-input bg-background focus:ring-primary/50'}`}
                                placeholder="—"
                              />
                              {presErr && <p className="mt-0.5 text-center text-xs text-red-600">0–35</p>}
                            </td>
                            <td className="px-3 py-2 text-center min-w-[52px]">
                              {rowHasError ? (
                                <span className="text-xs font-semibold text-red-500">ค่าผิด</span>
                              ) : rowComplete ? (
                                <span className="font-bold text-base text-primary">{getTotal(s)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {rowSaved && !rowDirty ? (
                                <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!rowComplete || rowHasError || isSaving}
                                  onClick={() => handleSaveTeam(team.id)}
                                  className="h-7 px-2 text-xs gap-1"
                                >
                                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                  Draft
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="flex flex-col items-end gap-2">
                {hasErrors && (
                  <p className="text-sm text-red-600 font-medium">
                    มีคะแนนที่กรอกเกินเกณฑ์ {invalidFields.length} ช่อง — กรุณาแก้ไขก่อนบันทึก
                  </p>
                )}
                {!allComplete && !hasErrors && (
                  <p className="text-sm text-muted-foreground">
                    กรอกครบแล้ว {completedCount}/{teams.length} ทีม — กรอกให้ครบทุกทีมเพื่อบันทึกรอบสุดท้าย
                  </p>
                )}
                <Button
                  onClick={() => submitAll.mutate()}
                  disabled={submitAll.isPending || hasErrors || !allComplete}
                  size="lg"
                  className="gap-2 bg-primary font-bold disabled:opacity-50"
                >
                  {submitAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  บันทึกทั้งหมด ({completedCount}/{teams.length} ทีม)
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
