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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row, error } = await supabaseAdmin
      .from('survey_responses')
      .select('id, token, submitted_at, trainings:training_id(title, start_date, end_date, location, instructor)')
      .eq('token', data.token)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return row
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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { token, ...payload } = data
    const { data: updated, error } = await supabaseAdmin
      .from('survey_responses')
      .update({ ...payload, suggestions: payload.suggestions || null, submitted_at: new Date().toISOString() } as never)
      .eq('token', token)
      .is('submitted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!updated) throw new Error('ลิงก์ไม่ถูกต้องหรือส่งคำตอบไปแล้ว')
    return { ok: true }
  })

// ------- Custom survey via survey_invitations -------

export const getSurveyInvitationByToken = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: inv, error } = await supabaseAdmin
      .from('survey_invitations' as any)
      .select('id, token, submitted_at, survey_id, surveys(*), trainings(title, instructor, start_date, end_date, location, cover_image_url, category)')
      .eq('token', data.token)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!inv) return null
    const { data: qs } = await supabaseAdmin
      .from('survey_questions' as any)
      .select('*')
      .eq('survey_id', (inv as any).survey_id)
      .order('position')
    return { inv, questions: qs ?? [] }
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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: inv, error: invErr } = await supabaseAdmin
      .from('survey_invitations' as any)
      .select('id, submitted_at')
      .eq('token', data.token)
      .maybeSingle()
    if (invErr) throw new Error(invErr.message)
    if (!inv) throw new Error('ลิงก์ไม่ถูกต้อง')
    if ((inv as any).submitted_at) throw new Error('ส่งคำตอบไปแล้ว')

    const { error: updErr } = await supabaseAdmin
      .from('survey_invitations' as any)
      .update({
        gender: data.demographics.gender || null,
        age_range: data.demographics.age_range || null,
        education: data.demographics.education || null,
        suggestions: data.demographics.suggestions || null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', (inv as any).id)
      .is('submitted_at', null)
    if (updErr) throw new Error(updErr.message)

    const rows = data.answers
      .filter((a) => a.value_number != null || a.value_text != null || a.value_json != null)
      .map((a) => ({
        invitation_id: (inv as any).id,
        question_id: a.question_id,
        value_number: a.value_number ?? null,
        value_text: a.value_text ?? null,
        value_json: a.value_json ?? null,
      }))
    if (rows.length) {
      const { error: ansErr } = await supabaseAdmin.from('survey_answers' as any).insert(rows)
      if (ansErr) throw new Error(ansErr.message)
    }
    return { ok: true }
  })
