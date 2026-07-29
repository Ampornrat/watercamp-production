import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const FilterSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  training_id: z.string().optional(),
})

export type ReportFilter = z.infer<typeof FilterSchema>

export interface ReportData {
  summary: { total: number; approved: number; pending: number; institutesCount: number }
  byCourse: { title: string; count: number }[]
  byRegion: { region: string; count: number }[]
  byStatus: { status: string; count: number }[]
  byInstitute: { institute_name: string; region: string; total: number; approved: number; pending: number }[]
}

export const getReportData = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => FilterSchema.parse(input))
  .handler(async ({ data }): Promise<ReportData> => {
    const pool = (await import('@/lib/db.server')).default

    const conditions: string[] = []
    const params: unknown[] = []

    if (data.start_date) {
      conditions.push('r.created_at >= ?')
      params.push(data.start_date + ' 00:00:00')
    }
    if (data.end_date) {
      conditions.push('r.created_at <= ?')
      params.push(data.end_date + ' 23:59:59')
    }
    if (data.training_id) {
      conditions.push('r.training_id = ?')
      params.push(data.training_id)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(r.approval_status = 'approved') AS approved,
         SUM(r.approval_status = 'pending') AS pending,
         COUNT(DISTINCT r.institute_id) AS institutesCount
       FROM registrations r ${where}`,
      params
    )
    const s = (summaryRows as any[])[0]
    const summary = {
      total: Number(s.total ?? 0),
      approved: Number(s.approved ?? 0),
      pending: Number(s.pending ?? 0),
      institutesCount: Number(s.institutesCount ?? 0),
    }

    const [courseRows] = await pool.query(
      `SELECT t.title, COUNT(r.id) AS count
       FROM registrations r
       LEFT JOIN trainings t ON t.id = r.training_id
       ${where}
       GROUP BY r.training_id, t.title
       ORDER BY count DESC`,
      params
    )
    const byCourse = (courseRows as any[]).map((row) => ({
      title: row.title ?? 'ไม่ระบุ',
      count: Number(row.count),
    }))

    const [regionRows] = await pool.query(
      `SELECT COALESCE(i.region, 'ไม่ระบุ') AS region, COUNT(r.id) AS count
       FROM registrations r
       LEFT JOIN institutes_tab i ON i.id = r.institute_id
       ${where}
       GROUP BY i.region
       ORDER BY count DESC`,
      params
    )
    const byRegion = (regionRows as any[]).map((row) => ({
      region: row.region ?? 'ไม่ระบุ',
      count: Number(row.count),
    }))

    const [statusRows] = await pool.query(
      `SELECT COALESCE(r.approval_status, 'pending') AS status, COUNT(*) AS count
       FROM registrations r ${where}
       GROUP BY r.approval_status`,
      params
    )
    const byStatus = (statusRows as any[]).map((row) => ({
      status: row.status,
      count: Number(row.count),
    }))

    const [instituteRows] = await pool.query(
      `SELECT
         COALESCE(i.institute, i.name, 'ไม่ระบุ') AS institute_name,
         COALESCE(i.region, 'ไม่ระบุ') AS region,
         COUNT(r.id) AS total,
         SUM(r.approval_status = 'approved') AS approved,
         SUM(r.approval_status = 'pending') AS pending
       FROM registrations r
       LEFT JOIN institutes_tab i ON i.id = r.institute_id
       ${where}
       GROUP BY r.institute_id, i.institute, i.name, i.region
       ORDER BY total DESC`,
      params
    )
    const byInstitute = (instituteRows as any[]).map((row) => ({
      institute_name: row.institute_name,
      region: row.region,
      total: Number(row.total),
      approved: Number(row.approved ?? 0),
      pending: Number(row.pending ?? 0),
    }))

    return { summary, byCourse, byRegion, byStatus, byInstitute }
  })

export const getTrainingsForFilter = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [rows] = await pool.query(`SELECT id, title FROM trainings ORDER BY title ASC`)
  return rows as { id: string; title: string }[]
})
