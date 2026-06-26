import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const TokenSchema = z.object({ token: z.string().min(8).max(128) })

const DemographicsSchema = z.object({
  gender: z.string().max(20).nullable().optional(),
  age_range: z.string().max(20).nullable().optional(),
  education: z.string().max(40).nullable().optional(),
  suggestions: z.string().max(4000).nullable().optional(),
})

// ------- Default training survey (survey_responses) -------

export const getSurveyResponseByToken = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    const [rows] = await pool.query(
      `SELECT sr.id, sr.token, sr.submitted_at,
              t.title, t.start_date, t.end_date, t.location, t.instructor
       FROM survey_responses sr
       LEFT JOIN trainings t ON t.id = sr.training_id
       WHERE sr.token = ?
       LIMIT 1`,
      [data.token]
    );
    const row = (rows as any[])[0] ?? null;
    if (!row) return null;
    return {
      id: row.id,
      token: row.token,
      submitted_at: row.submitted_at,
      trainings: { title: row.title, start_date: row.start_date, end_date: row.end_date, location: row.location, instructor: row.instructor },
    };
  })

const SubmitResponseSchema = TokenSchema.extend({
  gender: z.string().max(20),
  age_range: z.string().max(20),
  education: z.string().max(40),
  suggestions: z.string().max(4000).optional().nullable(),
  rating_knowledge: z.number().int().min(1).max(5),
  rating_application: z.number().int().min(1).max(5),
  rating_instructor: z.number().int().min(1).max(5),
  rating_assistant: z.number().int().min(1).max(5),
  rating_materials: z.number().int().min(1).max(5),
  rating_duration: z.number().int().min(1).max(5),
  rating_venue: z.number().int().min(1).max(5),
  rating_equipment: z.number().int().min(1).max(5),
})

export const submitSurveyResponse = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SubmitResponseSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    const { token, ...payload } = data;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.query(
      `UPDATE survey_responses SET
         gender=?, age_range=?, education=?, suggestions=?, submitted_at=?,
         rating_knowledge=?, rating_application=?, rating_instructor=?, rating_assistant=?,
         rating_materials=?, rating_duration=?, rating_venue=?, rating_equipment=?
       WHERE token=? AND submitted_at IS NULL`,
      [
        payload.gender, payload.age_range, payload.education, payload.suggestions || null, now,
        payload.rating_knowledge, payload.rating_application, payload.rating_instructor, payload.rating_assistant,
        payload.rating_materials, payload.rating_duration, payload.rating_venue, payload.rating_equipment,
        token,
      ]
    );
    if ((result as any).affectedRows === 0) throw new Error('ลิงก์ไม่ถูกต้องหรือส่งคำตอบไปแล้ว');
    return { ok: true };
  })

// ------- Custom survey via survey_invitations (stub — returns null if tables don't exist) -------

export const getSurveyInvitationByToken = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;
    try {
      const [invRows] = await pool.query(
        `SELECT si.*, t.title, t.instructor, t.start_date, t.end_date, t.location, t.cover_image_url, t.category
         FROM survey_invitations si
         LEFT JOIN trainings t ON t.id = si.training_id
         WHERE si.token = ? LIMIT 1`,
        [data.token]
      );
      const inv = (invRows as any[])[0] ?? null;
      if (!inv) return null;
      const [qs] = await pool.query(
        `SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY position`,
        [inv.survey_id]
      );
      return { inv, questions: qs as any[] };
    } catch {
      return null;
    }
  })

const AnswerSchema = z.object({
  question_id: z.string().uuid(),
  value_number: z.number().nullable().optional(),
  value_text: z.string().max(4000).nullable().optional(),
  value_json: z.any().nullable().optional(),
})

const SubmitInvitationSchema = TokenSchema.extend({
  demographics: DemographicsSchema,
  answers: z.array(AnswerSchema).max(200),
})

export const submitSurveyInvitation = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => SubmitInvitationSchema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default;

    const [invRows] = await pool.query(
      `SELECT id, submitted_at FROM survey_invitations WHERE token = ? LIMIT 1`,
      [data.token]
    );
    const inv = (invRows as any[])[0];
    if (!inv) throw new Error('ลิงก์ไม่ถูกต้อง');
    if (inv.submitted_at) throw new Error('ส่งคำตอบไปแล้ว');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      `UPDATE survey_invitations SET gender=?, age_range=?, education=?, suggestions=?, submitted_at=? WHERE id=? AND submitted_at IS NULL`,
      [
        data.demographics.gender || null, data.demographics.age_range || null,
        data.demographics.education || null, data.demographics.suggestions || null,
        now, inv.id,
      ]
    );

    const rows = data.answers
      .filter((a) => a.value_number != null || a.value_text != null || a.value_json != null)
      .map((a) => [inv.id, a.question_id, a.value_number ?? null, a.value_text ?? null, JSON.stringify(a.value_json ?? null)]);

    for (const row of rows) {
      await pool.query(
        `INSERT INTO survey_answers (invitation_id, question_id, value_number, value_text, value_json) VALUES (?, ?, ?, ?, ?)`,
        row
      );
    }

    return { ok: true };
  })
