import { useState, useMemo, useEffect } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Download, FileText, FileVideo, ChevronDown, ChevronRight, Loader2, Trophy, CheckCircle2, XCircle, Save } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSession } from '@/lib/auth.server'
import { getContestTeamsReport, setTeamScore, approveTeamRound1 } from '@/lib/contest.functions'
import { toast } from 'sonner'

export const Route = createFileRoute('/contest-report')({
  head: () => ({ meta: [{ title: 'รายงานทีมประกวด' }] }),
  beforeLoad: async () => {
    const user = await getSession()
    if (!user || user.role !== 'admin') throw redirect({ to: '/login' })
  },
  component: ContestReportPage,
})

function toFileUrl(path: string | null | undefined) {
  if (!path) return '#'
  if (path.startsWith('http') || path.startsWith('/')) return path
  return `/uploads/${path}`
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const round1Badge = {
  pending: <Badge variant="outline" className="text-xs">รอพิจารณา</Badge>,
  approved: <Badge className="bg-green-600 text-xs text-white hover:bg-green-600">ผ่านรอบ 1</Badge>,
  rejected: <Badge variant="destructive" className="text-xs">ไม่ผ่าน</Badge>,
}

export function ContestReportContent() {
  const getReportFn = useServerFn(getContestTeamsReport)
  const setScoreFn = useServerFn(setTeamScore)
  const approveFn = useServerFn(approveTeamRound1)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [scoreState, setScoreState] = useState<Record<string, { score: string; notes: string }>>({})
  const [savingScore, setSavingScore] = useState<string | null>(null)
  const [approvingTeam, setApprovingTeam] = useState<string | null>(null)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['contest-teams-report'],
    queryFn: () => getReportFn(),
  })

  useEffect(() => {
    if (!teams.length) return
    setScoreState((prev) => {
      const next = { ...prev }
      for (const t of teams) {
        if (!next[t.id]) next[t.id] = { score: t.score != null ? String(t.score) : '', notes: t.round1_notes ?? '' }
      }
      return next
    })
  }, [teams])

  const handleSaveScore = async (teamId: string) => {
    setSavingScore(teamId)
    try {
      const s = scoreState[teamId]
      await setScoreFn({ data: { teamId, score: s.score !== '' ? Number(s.score) : null, notes: s.notes || null } })
      await queryClient.invalidateQueries({ queryKey: ['contest-teams-report'] })
      toast.success('บันทึกคะแนนแล้ว')
    } catch {
      toast.error('บันทึกคะแนนไม่สำเร็จ')
    } finally {
      setSavingScore(null)
    }
  }

  const handleApprove = async (teamId: string, approve: boolean) => {
    setApprovingTeam(teamId)
    try {
      await approveFn({ data: { teamId, approve } })
      await queryClient.invalidateQueries({ queryKey: ['contest-teams-report'] })
      toast.success(approve ? 'อนุมัติทีมแล้ว — ส่ง email แจ้งสมาชิกทุกคน' : 'บันทึกผลไม่ผ่านแล้ว')
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setApprovingTeam(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return teams
    return teams.filter((t) =>
      t.team_name.toLowerCase().includes(q) ||
      t.institute_name.toLowerCase().includes(q) ||
      t.campaign_name.toLowerCase().includes(q) ||
      t.leader_name.toLowerCase().includes(q) ||
      t.members.some((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    )
  }, [teams, search])

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const exportCSV = () => {
    const escape = (v: any) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const headers = ['ชื่อทีม', 'สถาบัน', 'ชื่อแคมเปญ', 'หัวหน้าทีม', 'อีเมลหัวหน้า', 'สมาชิก', 'ไฟล์ Story Board (ลงทะเบียน)', 'ไฟล์ผลงาน', 'วันที่ลงทะเบียน']
    const rows = filtered.map((t) => [
      t.team_name,
      t.institute_name,
      t.campaign_name,
      t.leader_name,
      t.leader_email,
      t.members.map((m) => m.name).join(' / '),
      t.storyboard_file_name ?? '',
      t.submissions.map((s) => s.file_name).join(' / '),
      fmtDate(t.created_at),
    ].map(escape).join(','))
    const csv = '﻿' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contest_teams_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold">ทีมที่สมัครทั้งหมด: {teams.length} ทีม</span>
          {search && <Badge variant="outline">{filtered.length} ทีมที่กรอง</Badge>}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="ค้นหาทีม, สถาบัน, แคมเปญ, สมาชิก..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0} className="gap-1.5 shrink-0">
            <Download className="h-4 w-4" />Export CSV
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>ชื่อทีม</TableHead>
              <TableHead>สถาบัน</TableHead>
              <TableHead>ชื่อแคมเปญ</TableHead>
              <TableHead>สมาชิก</TableHead>
              <TableHead>Story Board</TableHead>
              <TableHead>คะแนน</TableHead>
              <TableHead>สถานะรอบ 1</TableHead>
              <TableHead>ผลงานที่ส่ง</TableHead>
              <TableHead>วันที่สมัคร</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-16 text-center text-muted-foreground">
                  ยังไม่มีทีมที่สมัคร
                </TableCell>
              </TableRow>
            )}
            {filtered.map((team) => {
              const isOpen = expanded.has(team.id)
              const allMembers = [
                { name: team.leader_name, email: team.leader_email, isLeader: true },
                ...team.members.map((m) => ({ ...m, isLeader: false })),
              ]
              return (
                <>
                  <TableRow key={team.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleExpand(team.id)}>
                    <TableCell>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{team.team_name}</div>
                    </TableCell>
                    <TableCell className="text-sm">{team.institute_name || '-'}</TableCell>
                    <TableCell className="text-sm">{team.campaign_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{allMembers.length} คน</Badge>
                    </TableCell>
                    <TableCell>
                      {team.storyboard_url ? (
                        <a
                          href={toFileUrl(team.storyboard_url)}
                          download={team.storyboard_file_name ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 underline hover:text-teal-700"
                        >
                          <FileText className="h-3 w-3" />
                          {team.storyboard_file_name ?? 'ดาวน์โหลด'}
                          {team.storyboard_file_size ? <span className="text-muted-foreground">({fmtSize(team.storyboard_file_size)})</span> : null}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {team.score != null ? team.score : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{round1Badge[team.round1_status]}</TableCell>
                    <TableCell>
                      {team.submissions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {team.submissions.map((s) => (
                            <a
                              key={s.id}
                              href={toFileUrl(s.file_url)}
                              download={s.file_name ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 underline hover:text-blue-700"
                            >
                              <FileVideo className="h-3 w-3" />
                              {s.file_name ?? 'ดาวน์โหลด'}
                              {s.file_size ? <span className="text-muted-foreground">({fmtSize(s.file_size)})</span> : null}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">ยังไม่ส่ง</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(team.created_at)}</TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow key={`${team.id}-detail`} className="bg-muted/20">
                      <TableCell />
                      <TableCell colSpan={9} className="py-4">
                        {/* Round 1 scoring & approval */}
                        <div className="mb-4 rounded-lg border bg-white p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ผลคะแนนรอบที่ 1</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">คะแนน (0–100)</label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                className="w-28"
                                value={scoreState[team.id]?.score ?? ''}
                                onChange={(e) => setScoreState((prev) => ({ ...prev, [team.id]: { ...prev[team.id], score: e.target.value } }))}
                                disabled={team.round1_status !== 'pending'}
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-xs text-muted-foreground">หมายเหตุกรรมการ</label>
                              <Textarea
                                rows={2}
                                className="resize-none"
                                value={scoreState[team.id]?.notes ?? ''}
                                onChange={(e) => setScoreState((prev) => ({ ...prev, [team.id]: { ...prev[team.id], notes: e.target.value } }))}
                                disabled={team.round1_status !== 'pending'}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={savingScore === team.id || team.round1_status !== 'pending'}
                              onClick={() => handleSaveScore(team.id)}
                            >
                              {savingScore === team.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              บันทึกคะแนน
                            </Button>
                          </div>
                          {team.round1_status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                                disabled={approvingTeam === team.id}
                                onClick={() => handleApprove(team.id, true)}
                              >
                                {approvingTeam === team.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                อนุมัติผ่านรอบ 1 (ส่ง email)
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1.5"
                                disabled={approvingTeam === team.id}
                                onClick={() => handleApprove(team.id, false)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                ไม่ผ่าน
                              </Button>
                            </div>
                          )}
                          {team.round1_status !== 'pending' && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {team.round1_status === 'approved'
                                ? `✅ อนุมัติแล้ว${team.round1_approved_at ? ` เมื่อ ${fmtDate(team.round1_approved_at)}` : ''}`
                                : '❌ บันทึกผลไม่ผ่านแล้ว'}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Members */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">สมาชิกในทีม</p>
                            <div className="space-y-1">
                              {allMembers.map((m, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  {m.isLeader && <Badge className="text-[10px] px-1.5 py-0 h-4">หัวหน้า</Badge>}
                                  <span className="font-medium">{m.name || '-'}</span>
                                  <span className="text-muted-foreground">{m.email}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Concept + Submissions detail */}
                          <div className="space-y-3">
                            {team.concept && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">คอนเซป</p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{team.concept}</p>
                              </div>
                            )}
                            {team.submissions.length > 0 && (
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ผลงานที่ส่งทั้งหมด ({team.submissions.length} รายการ)</p>
                                <div className="space-y-2">
                                  {team.submissions.map((s) => (
                                    <div key={s.id} className="rounded-md border bg-white p-3 text-sm space-y-1">
                                      <div className="font-medium">{s.campaign_name}</div>
                                      <div className="flex flex-wrap gap-3">
                                        <a
                                          href={toFileUrl(s.file_url)}
                                          download={s.file_name ?? undefined}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-600 underline"
                                        >
                                          <FileVideo className="h-3.5 w-3.5" />
                                          {s.file_name ?? 'ไฟล์ผลงาน'}
                                          {s.file_size ? <span className="text-muted-foreground text-xs">({fmtSize(s.file_size)})</span> : null}
                                        </a>
                                        {s.storyboard_url && (
                                          <a
                                            href={toFileUrl(s.storyboard_url)}
                                            download={s.storyboard_file_name ?? undefined}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-teal-600 underline"
                                          >
                                            <FileText className="h-3.5 w-3.5" />
                                            {s.storyboard_file_name ?? 'Story Board'}
                                          </a>
                                        )}
                                      </div>
                                      {s.note && <p className="text-xs text-muted-foreground">โน้ต: {s.note}</p>}
                                      <p className="text-xs text-muted-foreground">ส่งเมื่อ {fmtDate(s.created_at)} โดย {s.submitted_by_email ?? '-'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function ContestReportPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">รายงานทีมประกวด</h1>
        <p className="mt-1 mb-6 text-muted-foreground">ทีมที่สมัครเข้าร่วม ThaiWater Challenge</p>
        <ContestReportContent />
      </main>
      <SiteFooter />
    </div>
  )
}
