import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, useCallback } from 'react'
import { Loader2, Download, FileSpreadsheet, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { getSession } from '@/lib/auth.server'
import { getReportData, getTrainingsForFilter, type ReportData } from '@/lib/report.functions'

export const Route = createFileRoute('/report')({
  head: () => ({ meta: [{ title: 'รายงานสถิติ' }] }),
  beforeLoad: async () => {
    const user = await getSession()
    if (!user || user.role !== 'admin') throw redirect({ to: '/login' })
  },
  loader: async () => {
    const trainings = await getTrainingsForFilter()
    return { trainings }
  },
  component: ReportPage,
})

const STATUS_LABELS: Record<string, string> = {
  approved: 'อนุมัติแล้ว',
  pending: 'รอการอนุมัติ',
  rejected: 'ปฏิเสธ',
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

function ReportPage() {
  const { trainings } = Route.useLoaderData()
  const getReportFn = useServerFn(getReportData)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [trainingId, setTrainingId] = useState('all')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedTraining = trainings.find((t) => t.id === trainingId)

  const handleFetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getReportFn({
        data: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          training_id: trainingId === 'all' ? undefined : trainingId,
        },
      })
      setData(result)
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, trainingId, getReportFn])

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setTrainingId('all')
    setData(null)
  }

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['ลำดับ', 'ชื่อสถาบัน', 'ภาค', 'จำนวนผู้ลงทะเบียน', 'อนุมัติแล้ว', 'รอการอนุมัติ'],
      ...data.byInstitute.map((inst, i) => [
        i + 1, inst.institute_name, inst.region, inst.total, inst.approved, inst.pending,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildFilename('csv')
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = async () => {
    if (!data) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const rangeLabel = [startDate, endDate].filter(Boolean).join(' ถึง ') || 'ทั้งหมด'
    const courseLabel = selectedTraining?.title ?? 'ทั้งหมด'

    const ws1 = XLSX.utils.aoa_to_sheet([
      ['รายการ', 'จำนวน'],
      ['ผู้ลงทะเบียนทั้งหมด', data.summary.total],
      ['อนุมัติแล้ว', data.summary.approved],
      ['รอการอนุมัติ', data.summary.pending],
      ['จำนวนสถาบัน', data.summary.institutesCount],
      ['ช่วงวันที่', rangeLabel],
      ['หลักสูตร', courseLabel],
    ])
    XLSX.utils.book_append_sheet(wb, ws1, 'สรุปภาพรวม')

    const ws2 = XLSX.utils.json_to_sheet(
      data.byInstitute.map((inst, i) => ({
        ลำดับ: i + 1,
        ชื่อสถาบัน: inst.institute_name,
        ภาค: inst.region,
        ลงทะเบียน: inst.total,
        อนุมัติ: inst.approved,
        รอการอนุมัติ: inst.pending,
      }))
    )
    XLSX.utils.book_append_sheet(wb, ws2, 'แยกรายสถาบัน')

    const ws3 = XLSX.utils.json_to_sheet(
      data.byRegion.map((r) => ({ ภาค: r.region, จำนวนผู้ลงทะเบียน: r.count }))
    )
    XLSX.utils.book_append_sheet(wb, ws3, 'แยกรายภาค')

    const ws4 = XLSX.utils.json_to_sheet(
      data.byCourse.map((c) => ({ หลักสูตร: c.title, จำนวนผู้ลงทะเบียน: c.count }))
    )
    XLSX.utils.book_append_sheet(wb, ws4, 'แยกรายหลักสูตร')

    XLSX.writeFile(wb, buildFilename('xlsx'))
  }

  const buildFilename = (ext: string) => {
    const date = new Date().toISOString().slice(0, 10)
    const coursePart = selectedTraining ? `_${selectedTraining.title}` : ''
    return `รายงานสถิติ${coursePart}_${date}.${ext}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <BarChart2 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">รายงานสถิติผู้ลงทะเบียนอบรม</h1>
        </div>

        {/* Filter Panel */}
        <Card className="mb-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>วันที่เริ่มต้น</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>วันที่สิ้นสุด</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>หลักสูตร</Label>
              <Select value={trainingId} onValueChange={setTrainingId}>
                <SelectTrigger>
                  <SelectValue placeholder="ทุกหลักสูตร" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                  {trainings.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button className="flex-1" onClick={handleFetch} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                ดูรายงาน
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading}>
                รีเซ็ต
              </Button>
            </div>
          </div>
        </Card>

        {!data && !loading && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-muted-foreground">
            <BarChart2 className="mb-3 h-12 w-12 opacity-30" />
            <p>กดปุ่ม "ดูรายงาน" เพื่อแสดงข้อมูล</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard label="ผู้ลงทะเบียนทั้งหมด" value={data.summary.total} color="text-blue-600" />
              <SummaryCard label="อนุมัติแล้ว" value={data.summary.approved} color="text-green-600" />
              <SummaryCard label="รอการอนุมัติ" value={data.summary.pending} color="text-amber-600" />
              <SummaryCard label="สถาบันที่เข้าร่วม" value={data.summary.institutesCount} color="text-purple-600" />
            </div>

            {/* Charts */}
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {/* Bar chart by course */}
              <Card className="p-5">
                <h2 className="mb-4 text-sm font-semibold text-foreground">จำนวนผู้ลงทะเบียนแยกตามหลักสูตร</h2>
                {data.byCourse.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byCourse} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="จำนวน" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Bar chart by region */}
              <Card className="p-5">
                <h2 className="mb-4 text-sm font-semibold text-foreground">จำนวนผู้ลงทะเบียนแยกตามภาค</h2>
                {data.byRegion.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byRegion} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="จำนวน" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Pie chart by status */}
              <Card className="p-5 lg:col-span-2">
                <h2 className="mb-4 text-sm font-semibold text-foreground">สัดส่วนสถานะการอนุมัติ</h2>
                {data.byStatus.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.byStatus.map((s) => ({ ...s, name: STATUS_LABELS[s.status] ?? s.status }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.byStatus.map((entry, index) => (
                          <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Institute Table */}
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">สรุปแยกรายสถาบัน</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportCSV}>
                    <Download className="mr-1.5 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportExcel}>
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
              {data.byInstitute.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">ลำดับ</TableHead>
                        <TableHead>ชื่อสถาบัน</TableHead>
                        <TableHead>ภาค</TableHead>
                        <TableHead className="text-right">จำนวนผู้ลงทะเบียน</TableHead>
                        <TableHead className="text-right">อนุมัติแล้ว</TableHead>
                        <TableHead className="text-right">รอการอนุมัติ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byInstitute.map((inst, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-center">{i + 1}</TableCell>
                          <TableCell className="font-medium">{inst.institute_name}</TableCell>
                          <TableCell>{inst.region}</TableCell>
                          <TableCell className="text-right">{inst.total}</TableCell>
                          <TableCell className="text-right text-green-600">{inst.approved}</TableCell>
                          <TableCell className="text-right text-amber-600">{inst.pending}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      ไม่มีข้อมูล
    </div>
  )
}
