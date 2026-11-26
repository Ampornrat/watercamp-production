import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ClipboardList, Medal, RefreshCw, Trophy, Users, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getScoringReportR2 } from '@/lib/contest-scoring-r2.functions'

export const Route = createFileRoute('/contest-scoring-report-r2')({
  head: () => ({ meta: [{ title: 'รายงานผลคะแนนรอบ 2' }] }),
  component: ScoringReportR2Page,
})

const TOTAL_JUDGES = 12

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />
  return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums">{value.toFixed(1)}</span>
    </div>
  )
}

function ScoringReportR2Page() {
  const getReportFn = useServerFn(getScoringReportR2)
  const [expandedJudge, setExpandedJudge] = useState<string | null>(null)

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['scoring-report-r2'],
    queryFn: () => getReportFn(),
    refetchInterval: false,
  })

  const teams = data?.teams ?? []
  const judges = data?.judges ?? []
  const scores = data?.scores ?? []

  const scoredTeams = teams.filter((t) => t.judge_count > 0)
  const topTeam = scoredTeams[0]
  const totalTeams = teams.length

  // Group scores by judge email
  const scoresByJudge = scores.reduce<Record<string, typeof scores>>((acc, s) => {
    if (!acc[s.judge_email]) acc[s.judge_email] = []
    acc[s.judge_email].push(s)
    return acc
  }, {})

  // Comments only
  const comments = scores.filter((s) => s.comment && s.comment.trim())

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8 md:py-10">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><BarChart3 className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">รายงานผลคะแนนรอบ 2 (VDO)</h1>
                {dataUpdatedAt > 0 && (
                  <p className="text-xs text-muted-foreground">
                    อัปเดตล่าสุด: {new Date(dataUpdatedAt).toLocaleTimeString('th-TH')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> โหลดใหม่
              </Button>
              <Link to="/contest-scoring-r2">
                <Button variant="outline" size="sm" className="gap-2">
                  <ClipboardList className="h-4 w-4" /> กลับไปให้คะแนน
                </Button>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">กำลังโหลด...</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="mb-6 grid gap-4 sm:grid-cols-4">
                <Card className="flex items-center gap-4 p-5">
                  <Users className="h-8 w-8 text-primary opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">
                      {judges.length}
                      <span className="text-base text-muted-foreground">/{TOTAL_JUDGES}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">กรรมการที่ให้คะแนนแล้ว</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-4 p-5">
                  <Trophy className="h-8 w-8 text-yellow-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{topTeam?.avg_total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">คะแนนสูงสุด (เฉลี่ย)</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-4 p-5">
                  <BarChart3 className="h-8 w-8 text-blue-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{totalTeams}</p>
                    <p className="text-xs text-muted-foreground">ทีมทั้งหมด (รอบ 2)</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-4 p-5">
                  <MessageSquare className="h-8 w-8 text-purple-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{comments.length}</p>
                    <p className="text-xs text-muted-foreground">comment จากกรรมการ</p>
                  </div>
                </Card>
              </div>

              {/* Ranking table */}
              <Card className="mb-6 overflow-hidden">
                <div className="border-b px-6 py-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="font-semibold text-lg">อันดับคะแนนเฉลี่ยแต่ละทีม</h2>
                  <span className="ml-auto text-xs text-muted-foreground">* ค่าที่แสดงเป็นค่าเฉลี่ยจากกรรมการที่ให้คะแนนแล้ว (แสดง 0 หากยังไม่มีคะแนน)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">อันดับ</th>
                        <th className="px-4 py-3 text-left min-w-[160px]">ชื่อทีม</th>
                        <th className="px-4 py-3 text-center w-20">กรรมการ</th>
                        <th className="px-3 py-3 text-center min-w-[130px] text-blue-600">STEM<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center min-w-[130px] text-teal-600">ThaiWater<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center min-w-[130px] text-purple-600">เล่าเรื่อง<br/><span className="font-normal text-xs">(0–30)</span></th>
                        <th className="px-3 py-3 text-center min-w-[100px] text-orange-600">มีส่วนร่วม<br/><span className="font-normal text-xs">(0–10)</span></th>
                        <th className="px-4 py-3 text-center font-bold w-20">รวม<br/><span className="font-normal text-xs">(100)</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                            ยังไม่มีทีมที่ผ่านการคัดเลือกรอบ 2
                          </td>
                        </tr>
                      ) : (
                        teams.map((team, i) => {
                          const hasScores = team.judge_count > 0
                          const isTop = i === 0 && hasScores
                          return (
                            <tr key={team.id} className={`border-b transition-colors hover:bg-muted/30 ${isTop ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center">
                                  {hasScores ? rankIcon(i + 1) : <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold">{team.team_name}</div>
                                <div className="text-xs text-muted-foreground">{team.institute_name || team.campaign_name}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant={team.judge_count >= TOTAL_JUDGES ? 'default' : 'secondary'} className="text-xs">
                                  {team.judge_count}/{TOTAL_JUDGES}
                                </Badge>
                              </td>
                              <td className="px-3 py-3">
                                <ScoreBar value={team.avg_stem} max={30} color="bg-blue-500" />
                              </td>
                              <td className="px-3 py-3">
                                <ScoreBar value={team.avg_thaiwater} max={30} color="bg-teal-500" />
                              </td>
                              <td className="px-3 py-3">
                                <ScoreBar value={team.avg_storytelling} max={30} color="bg-purple-500" />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-sm font-semibold ${team.admin_engagement_score > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                  {team.admin_engagement_score}
                                </span>
                                {team.admin_engagement_score === 0 && (
                                  <div className="text-xs text-muted-foreground">รอ admin</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-lg font-bold tabular-nums ${
                                  isTop ? 'text-yellow-600' :
                                  i === 1 && hasScores ? 'text-gray-500' :
                                  i === 2 && hasScores ? 'text-amber-600' : 'text-primary'
                                }`}>
                                  {team.avg_total.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Judges + Score detail */}
              <div className="mb-6 grid gap-6 md:grid-cols-2">
                {/* Judge list */}
                <Card className="overflow-hidden">
                  <div className="border-b px-5 py-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">สถานะกรรมการ ({judges.length}/{TOTAL_JUDGES})</h2>
                  </div>
                  {/* Progress bar */}
                  <div className="px-5 pt-3 pb-1">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (judges.length / TOTAL_JUDGES) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="divide-y">
                    {judges.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-muted-foreground">ยังไม่มีกรรมการให้คะแนน</p>
                    ) : (
                      judges.map((j) => (
                        <div key={j.judge_email} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="font-medium text-sm">{j.judge_name}</p>
                            <p className="text-xs text-muted-foreground">{j.judge_email}</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">{j.scored_teams} ทีม</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Score breakdown per judge (expandable) */}
                <Card className="overflow-hidden">
                  <div className="border-b px-5 py-4">
                    <h2 className="font-semibold">คะแนนแยกรายกรรมการ</h2>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y">
                    {judges.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-muted-foreground">ยังไม่มีคะแนน</p>
                    ) : (
                      judges.map((j) => {
                        const isOpen = expandedJudge === j.judge_email
                        const judgeScores = scoresByJudge[j.judge_email] ?? []
                        return (
                          <div key={j.judge_email}>
                            <button
                              className="flex w-full items-center justify-between px-5 py-3 hover:bg-muted/30 text-left"
                              onClick={() => setExpandedJudge(isOpen ? null : j.judge_email)}
                            >
                              <div>
                                <p className="font-medium text-sm">{j.judge_name}</p>
                                <p className="text-xs text-muted-foreground">{j.judge_email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{judgeScores.length} ทีม</Badge>
                                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </button>
                            {isOpen && (
                              <div className="divide-y border-t bg-muted/20">
                                {judgeScores.map((s, idx) => (
                                  <div key={idx} className="px-5 py-2.5 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold">{s.team_name}</span>
                                      <span className="font-bold text-primary">{s.total_score}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      STEM {s.stem_score} / ThaiWater {s.thaiwater_score} / เล่าเรื่อง {s.storytelling_score} / มีส่วนร่วม {s.engagement_score}
                                    </div>
                                    {s.comment && (
                                      <div className="flex items-start gap-1 rounded-md bg-blue-50 px-2 py-1.5 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                                        <span>{s.comment}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </Card>
              </div>

              {/* Comments summary */}
              {comments.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="border-b px-5 py-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    <h2 className="font-semibold">สรุป Comment จากกรรมการทั้งหมด ({comments.length} รายการ)</h2>
                  </div>
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {comments.map((s, i) => (
                      <div key={i} className="px-5 py-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-foreground">{s.team_name}</span>
                          <span className="text-xs text-muted-foreground">{s.judge_name}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{s.comment}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
