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
      `SELECT r.id, r.approval_status, r.completion_status, r.created_at,
              t.title AS training_title, t.start_date, t.end_date, t.course_type
       FROM registrations r
       JOIN trainings t ON t.id = r.training_id
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
