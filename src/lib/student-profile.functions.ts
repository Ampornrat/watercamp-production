import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const getStudentProfile = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { email: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.email.trim().toLowerCase()

    const [profileRows] = await pool.query(
      `SELECT sp.*, i.institute AS institute_name
       FROM student_profiles sp
       LEFT JOIN institutes_tab i ON i.id = sp.institute_id
       WHERE sp.email = ? LIMIT 1`,
      [email]
    )
    const profile = (profileRows as any[])[0] ?? null
    if (!profile) return null

    const [regRows] = await pool.query(
      `SELECT r.id, r.approval_status, r.completion_status, r.self_confirmed_at, r.created_at,
              t.title AS training_title, t.start_date, t.end_date, t.course_type,
              COALESCE(ts.online_url, t.online_url) AS online_url,
              COALESCE(ts.start_datetime, t.start_date) AS session_start,
              COALESCE(ts.end_datetime, t.end_date) AS session_end,
              ts.region AS session_region
       FROM registrations r
       JOIN trainings t ON t.id = r.training_id
       LEFT JOIN training_sessions ts ON ts.id = r.session_id
       WHERE LOWER(r.guest_email) = ?
       ORDER BY r.created_at DESC`,
      [email]
    )

    return {
      ...profile,
      registrations: regRows as {
        id: string
        approval_status: string
        completion_status: string
        created_at: string
        training_title: string
        start_date: string
        end_date: string
        course_type: string
      }[],
    }
  })

export const confirmAttendance = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { registration_id: string; student_email: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const email = data.student_email.trim().toLowerCase()

    const [rows] = await pool.query(
      `SELECT id, approval_status, completion_status, self_confirmed_at
       FROM registrations WHERE id = ? AND LOWER(guest_email) = ? LIMIT 1`,
      [data.registration_id, email]
    )
    const reg = (rows as any[])[0]
    if (!reg) throw new Error('ไม่พบข้อมูลการลงทะเบียน')
    if (reg.approval_status !== 'approved') throw new Error('การลงทะเบียนยังไม่ได้รับการอนุมัติ')
    if (reg.completion_status !== 'enrolled') throw new Error('ไม่สามารถยืนยันได้ในขณะนี้')
    if (reg.self_confirmed_at) throw new Error('ยืนยันการเข้าเรียนไปแล้ว')

    await pool.query(
      `UPDATE registrations SET self_confirmed_at = NOW() WHERE id = ?`,
      [data.registration_id]
    )
    return { ok: true }
  })

export const upsertStudentProfile = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email().max(255),
      full_name: z.string().max(255),
      gender: z.string().max(50).optional(),
      age: z.number().int().optional(),
      education_level: z.string().max(100).optional(),
      field_of_study: z.string().max(255).nullable().optional(),
      participant_status: z.string().max(100).optional(),
      institute_id: z.string().uuid().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { randomUUID } = await import('crypto')
    const email = data.email.trim().toLowerCase()

    await pool.query(
      `INSERT INTO student_profiles
         (id, email, full_name, gender, age, education_level, field_of_study, participant_status, institute_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         gender = VALUES(gender),
         age = VALUES(age),
         education_level = VALUES(education_level),
         field_of_study = VALUES(field_of_study),
         participant_status = VALUES(participant_status),
         institute_id = VALUES(institute_id),
         updated_at = NOW()`,
      [
        randomUUID(), email,
        data.full_name, data.gender ?? null, data.age ?? null,
        data.education_level ?? null, data.field_of_study ?? null,
        data.participant_status ?? null, data.institute_id ?? null,
      ]
    )
    return { ok: true }
  })
