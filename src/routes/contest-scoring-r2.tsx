import { useState, useEffect, useCallback, Fragment } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, ClipboardList, Loader2, Save, CloudOff, FileVideo, FileText, Download, MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getTeamsForScoringR2, submitJudgeScoresR2, getJudgeExistingScoresR2 } from '@/lib/contest-scoring-r2.functions'

export const Route = createFileRoute('/contest-scoring-r2')({
  head: () => ({ meta: [{ title: 'แบบฟอร์มให้คะแนนรอบ 2' }] }),
  component: ContestScoringR2Page,
})

type Team = {
  id: string; team_name: string; campaign_name: string; institute_name: string
  admin_engagement_score: number | null
  // original submission
  file_url: string | null; file_name: string | null; file_size: number | null
  storyboard_url: string | null; storyboard_file_name: string | null
  note: string | null
  // revised submission
  revised_file_url: string | null; revised_file_name: string | null
  revised_storyboard_url: string | null; revised_storyboard_file_name: string | null
  revised_at: string | null
}

type ScoreEntry = {
  stem_score: string
  thaiwater_score: string
  storytelling_score: string
  comment: string
}

const SCORE_LIMITS = { stem_score: 30, thaiwater_score: 30, storytelling_score: 30 } as const

function isFieldInvalid(value: string, max: number): boolean {
  if (value === '') return false
  const n = parseFloat(value)
  return isNaN(n) || n < 0 || n > max || !Number.isFinite(n)
}

function isRowComplete(s: ScoreEntry): boolean {
  return s.stem_score !== '' && s.thaiwater_score !== '' && s.storytelling_score !== ''
}

function isRowValid(s: ScoreEntry): boolean {
  return isRowComplete(s) &&
    !isFieldInvalid(s.stem_score, 30) &&
    !isFieldInvalid(s.thaiwater_score, 30) &&
    !isFieldInvalid(s.storytelling_score, 30)
}

function clampOnBlur(value: string, max: number, onChange: (v: string) => void) {
  if (value === '') return
  const n = parseFloat(value)
  if (!isNaN(n)) {
    const clamped = Math.min(Math.max(0, n), max)
    if (clamped !== n) onChange(String(clamped))
  }
}

function localKey(email: string) { return `contest-r2-draft-${email.toLowerCase()}` }

function toFileUrl(path: string | null | undefined) {
  if (!path) return '#'
  if (path.startsWith('http') || path.startsWith('/')) return path
  return `/uploads/${path}`
}

function decodeFileName(name: string | null | undefined): string {
  if (!name) return 'ดาวน์โหลด'
  try { return decodeURIComponent(name) } catch { return name }
}

const EMPTY_SCORE: ScoreEntry = { stem_score: '', thaiwater_score: '', storytelling_score: '', comment: '' }

function ContestScoringR2Page() {
  const getTeamsFn = useServerFn(getTeamsForScoringR2)
  const getExistingFn = useServerFn(getJudgeExistingScoresR2)
  const submitFn = useServerFn(submitJudgeScoresR2)

  const [judgeName, setJudgeName] = useState('')
  const [judgeEmail, setJudgeEmail] = useState('')
  const [judgeConfirmed, setJudgeConfirmed] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({})
  const [savedTeams, setSavedTeams] = useState<Set<string>>(new Set())
  const [dirtyTeams, setDirtyTeams] = useState<Set<string>>(new Set())
  const [savingTeam, setSavingTeam] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getTeamsFn().then((t) => {
      setTeams(t)
      setScores((prev) => {
        const init: Record<string, ScoreEntry> = {}
        for (const team of t) init[team.id] = prev[team.id] ?? { ...EMPTY_SCORE }
        return init
      })
    })
  }, [])

  useEffect(() => {
    if (!judgeConfirmed || !judgeEmail) return
    try { localStorage.setItem(localKey(judgeEmail), JSON.stringify({ judgeName, scores })) } catch {}
  }, [scores, judgeConfirmed, judgeEmail, judgeName])

  const handleConfirmJudge = async () => {
    if (!judgeName.trim()) { toast.error('กรุณากรอกชื่อกรรมการ'); return }
    if (!judgeEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(judgeEmail)) {
      toast.error('กรุณากรอกอีเมลที่ถูกต้อง'); return
    }
    setLoading(true)
    try {
      const email = judgeEmail.trim().toLowerCase()
      const cached = localStorage.getItem(localKey(email))
      if (cached) {
        try {
          const { scores: cachedScores } = JSON.parse(cached)
          if (cachedScores) setScores((prev) => {
            const next = { ...prev }
            for (const [id, val] of Object.entries(cachedScores)) next[id] = val as ScoreEntry
            return next
          })
        } catch {}
      }
      const existing = await getExistingFn({ data: { judge_email: email } })
      if (existing.length > 0) {
        const serverSaved = new Set<string>()
        setScores((prev) => {
          const next = { ...prev }
          for (const e of existing) {
            next[e.team_id] = {
              stem_score: String(e.stem_score),
              thaiwater_score: String(e.thaiwater_score),
              storytelling_score: String(e.storytelling_score),
              comment: e.comment ?? '',
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

  const getTotal = (teamId: string, s: ScoreEntry) => {
    const team = teams.find((t) => t.id === teamId)
    const stem = parseFloat(s.stem_score) || 0
    const thai = parseFloat(s.thaiwater_score) || 0
    const story = parseFloat(s.storytelling_score) || 0
    const eng = team?.admin_engagement_score ?? 0
    return (stem + thai + story + eng).toFixed(1)
  }

  const handleSaveTeam = async (teamId: string) => {
    const s = scores[teamId]
    if (!s || !isRowValid(s)) { toast.error('กรุณากรอกคะแนนให้ครบและถูกต้องก่อนบันทึก'); return }
    setSavingTeam(teamId)
    try {
      await submitFn({
        data: {
          judge_name: judgeName.trim(),
          judge_email: judgeEmail.trim().toLowerCase(),
          scores: [{
            team_id: teamId,
            stem_score: parseFloat(s.stem_score),
            thaiwater_score: parseFloat(s.thaiwater_score),
            storytelling_score: parseFloat(s.storytelling_score),
            comment: s.comment.trim() || null,
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

  const completedCount = teams.filter((t) => isRowValid(scores[t.id] ?? EMPTY_SCORE)).length
  const allComplete = completedCount === teams.length && teams.length > 0
  const hasErrors = teams.some((t) => {
    const s = scores[t.id] ?? EMPTY_SCORE
    return (Object.keys(SCORE_LIMITS) as (keyof typeof SCORE_LIMITS)[]).some((f) => isFieldInvalid(s[f], SCORE_LIMITS[f]))
  })

  const submitAll = useMutation({
    mutationFn: async () => {
      const entries = []
      for (const team of teams) {
        const s = scores[team.id]
        if (!s || !isRowComplete(s)) throw new Error(`กรุณากรอกคะแนนให้ครบทุกทีม (ยังขาดทีม "${team.team_name}")`)
        const stem = parseFloat(s.stem_score)
        const thai = parseFloat(s.thaiwater_score)
        const story = parseFloat(s.storytelling_score)
        if (isNaN(stem) || stem < 0 || stem > 30) throw new Error(`คะแนน STEM ของทีม "${team.team_name}" ต้องอยู่ระหว่าง 0–30`)
        if (isNaN(thai) || thai < 0 || thai > 30) throw new Error(`คะแนน ThaiWater ของทีม "${team.team_name}" ต้องอยู่ระหว่าง 0–30`)
        if (isNaN(story) || story < 0 || story > 30) throw new Error(`คะแนนการเล่าเรื่องของทีม "${team.team_name}" ต้องอยู่ระหว่าง 0–30`)
        entries.push({ team_id: team.id, stem_score: stem, thaiwater_score: thai, storytelling_score: story, comment: s.comment.trim() || null })
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
          <h1 className="mb-2 text-2xl font-bold">บันทึกคะแนนรอบ 2 เรียบร้อย</h1>
          <p className="mb-6 text-muted-foreground">ขอบคุณ {judgeName} ที่ให้คะแนนทีมทั้งหมด</p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><ClipboardList className="h-6 w-6" /></div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold">แบบฟอร์มให้คะแนนรอบ 2 (VDO)</h1>
              <p className="text-sm text-muted-foreground">ThaiWater Challenge — กรรมการตัดสิน</p>
            </div>
          </div>

          {/* Judge identity */}
          <Card className="mb-6 p-5">
            <h2 className="mb-4 font-semibold">ข้อมูลกรรมการ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>ชื่อ-นามสกุลกรรมการ *</Label>
                <Input value={judgeName} onChange={(e) => setJudgeName(e.target.value)}
                  placeholder="เช่น รศ.ดร. สมชาย ใจดี" disabled={judgeConfirmed} />
              </div>
              <div className="space-y-1.5">
                <Label>อีเมลกรรมการ *</Label>
                <Input type="email" value={judgeEmail} onChange={(e) => setJudgeEmail(e.target.value)}
                  placeholder="judge@example.com" disabled={judgeConfirmed} />
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
                <Badge variant="secondary" className="text-xs">บันทึกแล้ว {savedTeams.size}/{teams.length} ทีม</Badge>
              </div>
            )}
          </Card>

          {/* Scoring criteria legend */}
          <Card className="mb-6 p-4">
            <h2 className="mb-3 font-semibold">เกณฑ์การให้คะแนน (รวม 100 คะแนน)</h2>
            <div className="grid gap-2 sm:grid-cols-4 text-sm">
              <div className="rounded-md bg-blue-50 p-3 text-center dark:bg-blue-950/30">
                <div className="text-2xl font-bold text-blue-600">30</div>
                <div className="font-medium">การประยุกต์ใช้ STEM</div>
              </div>
              <div className="rounded-md bg-teal-50 p-3 text-center dark:bg-teal-950/30">
                <div className="text-2xl font-bold text-teal-600">30</div>
                <div className="font-medium leading-tight">วิเคราะห์/ใช้ข้อมูล<br/>ThaiWater App</div>
              </div>
              <div className="rounded-md bg-purple-50 p-3 text-center dark:bg-purple-950/30">
                <div className="text-2xl font-bold text-purple-600">30</div>
                <div className="font-medium leading-tight">การเล่าเรื่อง<br/>ไอเดีย ชัดเจน</div>
              </div>
              <div className="rounded-md bg-orange-50 p-3 text-center dark:bg-orange-950/30">
                <div className="text-2xl font-bold text-orange-600">10</div>
                <div className="font-medium leading-tight">ยอดมีส่วนร่วม<br/>View/Like/Share</div>
                <div className="mt-1 text-xs text-orange-500">(admin กรอก)</div>
              </div>
            </div>
          </Card>

          {/* Score table */}
          {judgeConfirmed && (
            <>
              <Card className="mb-6 overflow-hidden">
                <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    กดดูไฟล์ผลงานแต่ละทีม แล้วกรอกคะแนน → กด <strong>"Draft"</strong> เพื่อบันทึกทีละรายการ
                  </p>
                  <span className="shrink-0 text-sm font-semibold text-primary ml-4">{completedCount}/{teams.length} ทีม</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-8">#</th>
                        <th className="px-4 py-3 text-left font-semibold min-w-[180px]">ชื่อทีม / มหาวิทยาลัย</th>
                        <th className="px-3 py-3 text-center font-semibold min-w-[160px]">ไฟล์ผลงาน</th>
                        <th className="px-3 py-3 text-center font-semibold text-blue-600">STEM<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-teal-600">ThaiWater<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-purple-600">เล่าเรื่อง<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center font-semibold text-orange-600">มีส่วนร่วม<br/><span className="font-normal text-xs">(admin)</span></th>
                        <th className="px-3 py-3 text-center font-semibold">รวม</th>
                        <th className="px-3 py-3 text-center font-semibold">Draft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, i) => {
                        const s = scores[team.id] ?? EMPTY_SCORE
                        const stemErr = isFieldInvalid(s.stem_score, 30)
                        const thaiErr = isFieldInvalid(s.thaiwater_score, 30)
                        const storyErr = isFieldInvalid(s.storytelling_score, 30)
                        const rowHasError = stemErr || thaiErr || storyErr
                        const rowSaved = savedTeams.has(team.id)
                        const rowDirty = dirtyTeams.has(team.id)
                        const rowComplete = isRowValid(s)
                        const isSaving = savingTeam === team.id

                        let rowBg = ''
                        if (rowHasError) rowBg = 'bg-red-50/40 dark:bg-red-950/10'
                        else if (rowSaved && !rowDirty) rowBg = 'bg-green-50/60 dark:bg-green-950/15'
                        else if (rowComplete) rowBg = 'bg-blue-50/40 dark:bg-blue-950/10'

                        const hasRevised = !!team.revised_file_url || !!team.revised_storyboard_url

                        return (
                          <Fragment key={team.id}>
                            <tr className={`border-b transition-colors ${rowBg}`}>
                              <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold">{team.team_name}</div>
                                <div className="text-xs text-muted-foreground">{team.institute_name || '—'}</div>
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
                              <td className="px-3 py-3">
                                {/* Original submission */}
                                <div className="flex flex-col gap-1">
                                  <div className="text-xs text-muted-foreground font-medium mb-0.5">ต้นฉบับ</div>
                                  {team.file_url ? (
                                    <a href={toFileUrl(team.file_url)} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300">
                                      <FileVideo className="h-3 w-3 shrink-0" />
                                      <span className="truncate max-w-[80px]">{decodeFileName(team.file_name)}</span>
                                      <Download className="h-3 w-3 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">ไม่มี VDO</span>
                                  )}
                                  {team.storyboard_url ? (
                                    <a href={toFileUrl(team.storyboard_url)} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">
                                      <FileText className="h-3 w-3 shrink-0" />
                                      <span className="truncate max-w-[80px]">Script/SB</span>
                                      <Download className="h-3 w-3 shrink-0" />
                                    </a>
                                  ) : null}
                                </div>
                                {/* Revised submission */}
                                {hasRevised && (
                                  <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-dashed">
                                    <div className="text-xs text-green-600 font-medium mb-0.5">แก้ไขแล้ว</div>
                                    {team.revised_file_url ? (
                                      <a href={toFileUrl(team.revised_file_url)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300">
                                        <FileVideo className="h-3 w-3 shrink-0" />
                                        <span className="truncate max-w-[80px]">{decodeFileName(team.revised_file_name)}</span>
                                        <Download className="h-3 w-3 shrink-0" />
                                      </a>
                                    ) : null}
                                    {team.revised_storyboard_url ? (
                                      <a href={toFileUrl(team.revised_storyboard_url)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300">
                                        <FileText className="h-3 w-3 shrink-0" />
                                        <span className="truncate max-w-[80px]">Script แก้ไข</span>
                                        <Download className="h-3 w-3 shrink-0" />
                                      </a>
                                    ) : null}
                                  </div>
                                )}
                              </td>
                              {/* Score inputs: STEM, ThaiWater, Storytelling */}
                              {([
                                { field: 'stem_score' as const, max: 30, err: stemErr },
                                { field: 'thaiwater_score' as const, max: 30, err: thaiErr },
                                { field: 'storytelling_score' as const, max: 30, err: storyErr },
                              ]).map(({ field, max, err }) => (
                                <td key={field} className="px-3 py-2 w-24">
                                  <input
                                    type="number" min={0} max={max} step={0.5}
                                    value={s[field]}
                                    onChange={(e) => setScore(team.id, field, e.target.value)}
                                    onBlur={(e) => clampOnBlur(e.target.value, max, (v) => setScore(team.id, field, v))}
                                    className={`w-full rounded-md border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-2 ${err ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400/50' : 'border-input bg-background focus:ring-primary/50'}`}
                                    placeholder="—"
                                  />
                                  {err && <p className="mt-0.5 text-center text-xs text-red-600">0–{max}</p>}
                                </td>
                              ))}
                              {/* Engagement score (read-only, set by admin) */}
                              <td className="px-3 py-2 w-24 text-center">
                                {team.admin_engagement_score !== null ? (
                                  <span className="inline-block rounded-md bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-600 dark:bg-orange-950/40">
                                    {team.admin_engagement_score}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">รอ admin</span>
                                )}
                              </td>
                              {/* Total */}
                              <td className="px-3 py-2 text-center min-w-[52px]">
                                {rowHasError ? (
                                  <span className="text-xs font-semibold text-red-500">ค่าผิด</span>
                                ) : rowComplete ? (
                                  <span className="font-bold text-base text-primary">{getTotal(team.id, s)}</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              {/* Draft button */}
                              <td className="px-3 py-2 text-center">
                                {rowSaved && !rowDirty ? (
                                  <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                                ) : (
                                  <Button size="sm" variant="outline"
                                    disabled={!rowComplete || rowHasError || isSaving}
                                    onClick={() => handleSaveTeam(team.id)}
                                    className="h-7 px-2 text-xs gap-1">
                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                    Draft
                                  </Button>
                                )}
                              </td>
                            </tr>
                            {/* Comment row */}
                            <tr className={`border-b ${rowBg}`}>
                              <td colSpan={9} className="px-4 pb-3 pt-1">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <Textarea
                                    value={s.comment}
                                    onChange={(e) => setScore(team.id, 'comment', e.target.value)}
                                    placeholder="Comment ผลงาน (ไม่บังคับ) — ข้อเสนอแนะสำหรับทีม..."
                                    rows={2}
                                    maxLength={2000}
                                    className="text-xs resize-none"
                                  />
                                </div>
                              </td>
                            </tr>
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="flex flex-col items-end gap-2">
                {hasErrors && (
                  <p className="text-sm text-red-600 font-medium">มีคะแนนที่กรอกเกินเกณฑ์ — กรุณาแก้ไขก่อนบันทึก</p>
                )}
                {!allComplete && !hasErrors && (
                  <p className="text-sm text-muted-foreground">
                    กรอกครบแล้ว {completedCount}/{teams.length} ทีม — กรอกให้ครบทุกทีมเพื่อบันทึกรอบสุดท้าย
                  </p>
                )}
                <Button onClick={() => submitAll.mutate()}
                  disabled={submitAll.isPending || hasErrors || !allComplete}
                  size="lg" className="gap-2 bg-primary font-bold disabled:opacity-50">
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

          {judgeConfirmed && teams.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <FileVideo className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>ยังไม่มีทีมที่ส่งผลงานรอบ 2</p>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
