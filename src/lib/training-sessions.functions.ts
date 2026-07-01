import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const REGIONS = ['ภาคอีสาน', 'ภาคเหนือ', 'ภาคกลาง', 'ภาคใต้'] as const

const SessionInput = z.object({
  id: z.string().uuid().optional(),
  training_id: z.string().uuid(),
  region: z.enum(REGIONS),
  start_datetime: z.string().min(1),
  end_datetime: z.string().min(1),
  location: z.string().max(255).optional().nullable(),
  online_url: z.string().max(500).optional().nullable(),
  capacity: z.number().int().min(1).max(10000),
})

export const getSessionsForTraining = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { training_id: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const [rows] = await pool.query(
      `SELECT ts.*,
              COUNT(r.id) AS reg_count
       FROM training_sessions ts
       LEFT JOIN registrations r ON r.session_id = ts.id
       WHERE ts.training_id = ?
       GROUP BY ts.id
       ORDER BY ts.start_datetime ASC`,
      [data.training_id]
    )
    return rows as {
      id: string; training_id: string; region: string
      start_datetime: string; end_datetime: string
      location: string | null; online_url: string | null
      capacity: number; reg_count: number; created_at: string
    }[]
  })

export const saveAdminSession = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SessionInput.parse(d))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    if (data.id) {
      await pool.query(
        `UPDATE training_sessions SET region=?, start_datetime=?, end_datetime=?, location=?, online_url=?, capacity=? WHERE id=?`,
        [data.region, data.start_datetime, data.end_datetime, data.location ?? null, data.online_url ?? null, data.capacity, data.id]
      )
      return { id: data.id }
    }
    const id = randomUUID()
    await pool.query(
      `INSERT INTO training_sessions (id, training_id, region, start_datetime, end_datetime, location, online_url, capacity) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.training_id, data.region, data.start_datetime, data.end_datetime, data.location ?? null, data.online_url ?? null, data.capacity]
    )
    return { id }
  })

export const deleteAdminSession = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => (d as { id: string }))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    await pool.query(`DELETE FROM training_sessions WHERE id = ?`, [data.id])
    return { ok: true }
  })
