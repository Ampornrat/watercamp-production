import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, ClipboardList, Medal, Trophy, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getScoringReport } from '@/lib/contest-scoring.functions'

export const Route = createFileRoute('/contest-scoring-report')({
  head: () => ({ meta: [{ title: 'รายงานผลคะแนนการประกวด' }] }),
  component: ScoringReportPage,
})

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
      <span className="w-10 text-right text-xs font-semibold">{value ?? '—'}</span>
    </div>
  )
}

function ScoringReportPage() {
  const getReportFn = useServerFn(getScoringReport)

  const { data, isLoading } = useQuery({
    queryKey: ['scoring-report'],
    queryFn: () => getReportFn(),
    refetchInterval: 30_000,
  })

  const teams = data?.teams ?? []
  const judges = data?.judges ?? []
  const scores = data?.scores ?? []
  const totalJudges = 10

  const scoredTeams = teams.filter((t) => t.judge_count > 0)
  const topTeam = scoredTeams[0]

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
                <h1 className="font-heading text-2xl font-extrabold">รายงานผลคะแนนการประกวด</h1>
                <p className="text-sm text-muted-foreground">ThaiWater Challenge — อัปเดตทุก 30 วินาที</p>
              </div>
            </div>
            <Link to="/contest-scoring">
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <ClipboardList className="h-4 w-4" /> กลับไปให้คะแนน
              </Button>
            </Link>
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
                    <p className="text-2xl font-bold">{judges.length}<span className="text-base text-muted-foreground">/{totalJudges}</span></p>
                    <p className="text-xs text-muted-foreground">กรรมการที่ให้คะแนนแล้ว</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-4 p-5">
                  <Trophy className="h-8 w-8 text-yellow-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{topTeam?.avg_total ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">คะแนนสูงสุด (เฉลี่ย)</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-4 p-5">
                  <BarChart3 className="h-8 w-8 text-blue-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{teams.length}</p>
                    <p className="text-xs text-muted-foreground">ทีมทั้งหมด</p>
                  </div>
                </Card>
                <Card className="flex items-center gap-4 p-5">
                  <Medal className="h-8 w-8 text-green-500 opacity-80" />
                  <div>
                    <p className="text-2xl font-bold">{scoredTeams.length}</p>
                    <p className="text-xs text-muted-foreground">ทีมที่มีคะแนนแล้ว</p>
                  </div>
                </Card>
              </div>

              {/* Ranking table */}
              <Card className="mb-8 overflow-hidden">
                <div className="border-b px-6 py-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h2 className="font-semibold text-lg">อันดับคะแนนเฉลี่ยแต่ละทีม</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">อันดับ</th>
                        <th className="px-4 py-3 text-left">ชื่อทีม / แคมเปญ</th>
                        <th className="px-4 py-3 text-center">กรรมการ</th>
                        <th className="px-4 py-3 text-center min-w-[140px] text-blue-600">STEM (35)</th>
                        <th className="px-4 py-3 text-center min-w-[140px] text-teal-600">เนื้อหา (30)</th>
                        <th className="px-4 py-3 text-center min-w-[140px] text-purple-600">เทคนิค (35)</th>
                        <th className="px-4 py-3 text-center font-bold">รวม (100)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, i) => (
                        <tr key={team.id} className={`border-b transition-colors hover:bg-muted/30 ${i === 0 && team.judge_count > 0 ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">{team.judge_count > 0 ? rankIcon(i + 1) : <span className="text-muted-foreground">—</span>}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{team.team_name}</div>
                            <div className="text-xs text-muted-foreground">{team.campaign_name}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={team.judge_count >= totalJudges ? 'default' : 'secondary'}>
                              {team.judge_count}/{totalJudges}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {team.judge_count > 0 ? <ScoreBar value={team.avg_stem} max={35} color="bg-blue-500" /> : <span className="text-muted-foreground text-xs block text-center">ยังไม่มีคะแนน</span>}
                          </td>
                          <td className="px-4 py-3">
                            {team.judge_count > 0 ? <ScoreBar value={team.avg_content} max={30} color="bg-teal-500" /> : null}
                          </td>
                          <td className="px-4 py-3">
                            {team.judge_count > 0 ? <ScoreBar value={team.avg_presentation} max={35} color="bg-purple-500" /> : null}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {team.judge_count > 0 ? (
                              <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-amber-600' : 'text-primary'}`}>
                                {team.avg_total}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Judges status */}
              <div className="mb-8 grid gap-6 md:grid-cols-2">
                <Card className="overflow-hidden">
                  <div className="border-b px-5 py-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">สถานะกรรมการ ({judges.length}/{totalJudges})</h2>
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
                          <Badge variant="secondary">{j.scored_teams} ทีม</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Score breakdown per judge */}
                <Card className="overflow-hidden">
                  <div className="border-b px-5 py-4">
                    <h2 className="font-semibold">คะแนนแยกรายกรรมการ</h2>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y">
                    {scores.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-muted-foreground">ยังไม่มีคะแนน</p>
                    ) : (
                      scores.map((s, i) => (
                        <div key={i} className="px-5 py-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold">{s.team_name}</span>
                              <span className="ml-2 text-muted-foreground">— {s.judge_name}</span>
                            </div>
                            <span className="font-bold text-primary">{s.total_score}</span>
                          </div>
                          <div className="mt-0.5 text-muted-foreground">
                            STEM {s.stem_score} / เนื้อหา {s.content_score} / เทคนิค {s.presentation_score}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
