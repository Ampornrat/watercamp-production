import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const getInstitutes = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [rows] = await pool.query(
    `SELECT id, institute FROM institutes_tab WHERE institute IS NOT NULL ORDER BY institute ASC`
  )
  return rows as { id: string; institute: string }[]
})

export const checkInstituteHasMainAdvisor = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { institute_id: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const [rows] = await pool.query(
      `SELECT id FROM advisors WHERE institute_id = ? AND role = 'main' LIMIT 1`,
      [data.institute_id]
    )
    return (rows as any[]).length > 0
  })

export const getInstituteJoinParticipation = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { institute_id: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const [rows] = await pool.query(
      `SELECT id FROM institute_participations WHERE institute_id = ? AND status = 'join' ORDER BY created_at DESC LIMIT 1`,
      [data.institute_id]
    )
    const row = (rows as any[])[0]
    return row ? { id: row.id as string } : null
  })

const Schema = z.object({
  full_name: z.string().min(1).max(255),
  position: z.string().min(1).max(255),
  faculty: z.string().min(1).max(255),
  institute_id: z.string().uuid(),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  role: z.enum(['main', 'assistant']),
  institute_participation_id: z.string().uuid().optional().nullable(),
  redirect_to: z.string().url().max(500).optional().nullable(),
})

export const registerAdvisor = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.email.trim().toLowerCase()

    // Enforce role rules: only one 'main' per institute
    if (data.role === 'main') {
      const [existing] = await pool.query(
        `SELECT id FROM advisors WHERE institute_id = ? AND role = 'main' LIMIT 1`,
        [data.institute_id]
      )
      if ((existing as any[]).length > 0) {
        throw new Error('สถาบันนี้มีอาจารย์หลักแล้ว กรุณาเลือกบทบาทเป็นอาจารย์ผู้ช่วย')
      }
    }

    // Check duplicate advisor email
    const [dupRows] = await pool.query(
      `SELECT id FROM advisors WHERE LOWER(email) = ? LIMIT 1`,
      [email]
    )
    if ((dupRows as any[]).length > 0) throw new Error('อีเมลนี้ได้ลงทะเบียนเป็นอาจารย์แล้ว')

    const id = randomUUID()
    try {
      await pool.query(
        `INSERT INTO advisors (id, full_name, position, faculty, institute_id, email, phone, address, postal_code, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id, data.full_name, data.position, data.faculty, data.institute_id,
          email, data.phone || null, data.address || null, data.postal_code || null, data.role,
        ]
      )
    } catch (err: any) {
      throw new Error(err?.message ?? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }

    return { id }
  })
