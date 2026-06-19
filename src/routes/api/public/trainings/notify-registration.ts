import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

// Public endpoint: send a registration confirmation email for a known registration,
// plus an approval-request email to the student's advisor when advisor_email is set.
export const Route = createFileRoute('/api/public/trainings/notify-registration')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let registrationId = ''
        let trainingIdInput = ''
        let emailInput = ''
        let electivesCount: number | undefined
        try {
          const body = await request.json()
          registrationId = String(body.registrationId || '').trim()
          trainingIdInput = String(body.trainingId || '').trim()
          emailInput = String(body.email || '').trim().toLowerCase()
          if (typeof body.electivesCount === 'number') electivesCount = body.electivesCount
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        let reg: any = null
        if (registrationId) {
          if (!uuidRe.test(registrationId)) {
            return Response.json({ error: 'Invalid registrationId' }, { status: 400 })
          }
          const { data } = await supabase
            .from('registrations')
            .select('id, guest_name, guest_email, user_id, training_id, institute_id')
            .eq('id', registrationId)
            .maybeSingle()
          reg = data
        } else if (trainingIdInput && emailInput) {
          if (!uuidRe.test(trainingIdInput)) {
            return Response.json({ error: 'Invalid trainingId' }, { status: 400 })
          }
          const { data } = await supabase
            .from('registrations')
            .select('id, guest_name, guest_email, user_id, training_id, institute_id, created_at')
            .eq('training_id', trainingIdInput)
            .ilike('guest_email', emailInput)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          reg = data
        } else {
          return Response.json({ error: 'registrationId or (trainingId+email) required' }, { status: 400 })
        }

        if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 })

        // Resolve recipient: prefer guest_email, otherwise look up auth user email
        let recipientEmail: string | null = reg.guest_email
        let recipientName: string | null = reg.guest_name
        if (!recipientEmail && reg.user_id) {
          const { data: userRes } = await supabase.auth.admin.getUserById(reg.user_id)
          recipientEmail = userRes?.user?.email ?? null
          recipientName = recipientName || (userRes?.user?.user_metadata as any)?.full_name || null
        }
        if (!recipientEmail) return Response.json({ error: 'No recipient email on registration' }, { status: 400 })

        const { data: training } = await supabase
          .from('trainings')
          .select('title, start_date, end_date, location')
          .eq('id', reg.training_id)
          .maybeSingle()

        const fmt = (s?: string | null) =>
          s ? new Date(s).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }) : undefined

        const origin = new URL(request.url).origin

        // 1) student confirmation
        const studentSend = await fetch(`${origin}/lovable/email/transactional/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({
            templateName: 'registration-confirmation',
            recipientEmail,
            idempotencyKey: `registration-confirm-${reg.id}`,
            templateData: {
              name: recipientName || undefined,
              trainingTitle: training?.title,
              startDate: fmt(training?.start_date),
              endDate: fmt(training?.end_date),
              location: training?.location || undefined,
              electivesCount,
            },
          }),
        })
        if (!studentSend.ok) {
          const text = await studentSend.text().catch(() => '')
          console.error('notify-registration: student send failed', { status: studentSend.status, text })
        }

        // 2) advisor approval request — email ALL advisors of the institute
        if (reg.institute_id) {
          const { data: instAdvisors } = await supabase
            .from('advisors')
            .select('full_name, email')
            .eq('institute_id', reg.institute_id)
          const recipients: Array<{ email: string; full_name?: string | null }> = (instAdvisors ?? []).map((a) => ({
            email: String(a.email).toLowerCase(),
            full_name: a.full_name,
          }))

          for (const r of recipients) {
            const advisorSend = await fetch(`${origin}/lovable/email/transactional/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({
                templateName: 'advisor-approval-request',
                recipientEmail: r.email,
                idempotencyKey: `advisor-approval-${reg.id}-${r.email}`,
                templateData: {
                  advisorName: r.full_name || undefined,
                  studentName: recipientName || undefined,
                  studentEmail: recipientEmail,
                  trainingTitle: training?.title,
                  startDate: fmt(training?.start_date),
                  endDate: fmt(training?.end_date),
                  location: training?.location || undefined,
                  approvalUrl: `${origin}/advisor/dashboard`,
                },
              }),
            })
            if (!advisorSend.ok) {
              const text = await advisorSend.text().catch(() => '')
              console.error('notify-registration: advisor send failed', { status: advisorSend.status, to: r.email, text })
            }
          }
        }

        return Response.json({ success: true })
      },
    },
  },
})
