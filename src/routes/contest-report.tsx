import { useState, useMemo } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Download, FileText, FileVideo, ChevronDown, ChevronRight, Loader2, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSession } from '@/lib/auth.server'
import { getContestTeamsReport } from '@/lib/contest.functions'

export const Route = createFileRoute('/contest-report')({
  head: () => ({ meta: [{ title: 'รายงานทีมประกวด' }] }),
  beforeLoad: async () => {
    const user = await getSession()
    if (!user || user.role !== 'admin') throw redirect({ to: '/login' })
  },
  component: ContestReportPage,
})

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function ContestReportContent() {
  const getReportFn = useServerFn(getContestTeamsReport)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['contest-teams-report'],
    queryFn: () => getReportFn(),
  })

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
              <TableHead>ผลงานที่ส่ง</TableHead>
              <TableHead>วันที่สมัคร</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
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
                          href={team.storyboard_url}
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
                    <TableCell>
                      {team.submissions.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {team.submissions.map((s) => (
                            <a
                              key={s.id}
                              href={s.file_url}
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
                      <TableCell colSpan={7} className="py-4">
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
                                          href={s.file_url}
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
                                            href={s.storyboard_url}
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
