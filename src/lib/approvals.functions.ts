import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const VoteSchema = z.object({
  registrationId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(1000).optional().nullable(),
})

export interface VoteResult {
  totalAdvisors: number
  votes: number
  approvals: number
  rejections: number
  allVoted: boolean
  finalStatus: 'pending' | 'approved' | 'rejected'
}

export const castAdvisorVote = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VoteSchema.parse(input))
  .handler(async ({ data, context }): Promise<VoteResult> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    let email = (context.claims?.email as string | undefined)?.toLowerCase()
    if (!email) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId)
      email = u?.user?.email?.toLowerCase()
    }
    if (!email) throw new Error('ไม่พบอีเมลผู้ใช้')

    // Resolve current advisor
    const { data: me } = await supabaseAdmin
      .from('advisors')
      .select('id, institute_id')
      .ilike('email', email)
      .maybeSingle()
    if (!me || !me.institute_id) throw new Error('ผู้ใช้นี้ไม่ได้เป็นอาจารย์ในระบบ')

    // Resolve registration
    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('id, advisor_email, institute_id')
      .eq('id', data.registrationId)
      .maybeSingle()
    if (!reg) throw new Error('ไม่พบใบสมัคร')

    // Authorization: advisor may vote if registration's institute_id matches
    // the advisor's institute, OR the registration's entered advisor_email
    // belongs to an advisor in the same institute.
    let authorized = false
    if (reg.institute_id && reg.institute_id === me.institute_id) {
      authorized = true
    } else if (reg.advisor_email) {
      const { data: entered } = await supabaseAdmin
        .from('advisors')
        .select('institute_id')
        .ilike('email', reg.advisor_email.toLowerCase())
        .maybeSingle()
      if (entered && entered.institute_id === me.institute_id) authorized = true
    }
    if (!authorized) throw new Error('ท่านไม่มีสิทธิ์อนุมัติใบสมัครนี้')

    // Upsert vote (one per advisor per registration)
    const { error: upsertErr } = await supabaseAdmin
      .from('registration_approvals' as any)
      .upsert(
        {
          registration_id: data.registrationId,
          advisor_id: me.id,
          decision: data.decision,
          note: data.note || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'registration_id,advisor_id' },
      )
    if (upsertErr) throw new Error(upsertErr.message)

    // Tally
    const { count } = await supabaseAdmin
      .from('advisors')
      .select('id', { count: 'exact', head: true })
      .eq('institute_id', me.institute_id)
    const totalAdvisors = count ?? 0

    const { data: votesRows } = await supabaseAdmin
      .from('registration_approvals' as any)
      .select('decision')
      .eq('registration_id', data.registrationId)

    const votes = votesRows?.length ?? 0
    const approvals = votesRows?.filter((v: any) => v.decision === 'approve').length ?? 0
    const rejections = votes - approvals
    const allVoted = totalAdvisors > 0 && votes >= totalAdvisors

    let finalStatus: 'pending' | 'approved' | 'rejected' = 'pending'
    if (allVoted) {
      finalStatus = rejections === 0 ? 'approved' : 'rejected'
      await supabaseAdmin
        .from('registrations')
        .update({
          approval_status: finalStatus,
          approved_at: new Date().toISOString(),
          approved_by_advisor_id: me.id,
        })
        .eq('id', data.registrationId)

      // Notify applicant of result
      try {
        const { data: regFull } = await supabaseAdmin
          .from('registrations')
          .select('id, guest_name, guest_email, user_id, training_id')
          .eq('id', data.registrationId)
          .maybeSingle()

        let recipientEmail: string | null = regFull?.guest_email ?? null
        let recipientName: string | null = regFull?.guest_name ?? null
        if (!recipientEmail && regFull?.user_id) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(regFull.user_id)
          recipientEmail = u?.user?.email ?? null
          recipientName = recipientName || ((u?.user?.user_metadata as any)?.full_name ?? null)
        }

        if (recipientEmail && regFull?.training_id) {
          const { data: training } = await supabaseAdmin
            .from('trainings')
            .select('title, start_date, end_date, location')
            .eq('id', regFull.training_id)
            .maybeSingle()

          const fmt = (s?: string | null) =>
            s ? new Date(s).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }) : undefined

          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
          const origin = new URL(getRequest().url).origin
          const res = await fetch(`${origin}/lovable/email/transactional/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({
              templateName: 'registration-approval-result',
              recipientEmail,
              idempotencyKey: `approval-result-${data.registrationId}-${finalStatus}`,
              templateData: {
                name: recipientName || undefined,
                trainingTitle: training?.title,
                startDate: fmt(training?.start_date),
                endDate: fmt(training?.end_date),
                location: training?.location || undefined,
                status: finalStatus,
                totalAdvisors,
                approvals,
                rejections,
              },
            }),
          })
          if (!res.ok) {
            const t = await res.text().catch(() => '')
            console.error('approval-result email failed', { status: res.status, t })
          }
        }
      } catch (e) {
        console.error('approval-result email error', e)
      }
    }

    return { totalAdvisors, votes, approvals, rejections, allVoted, finalStatus }
  })
