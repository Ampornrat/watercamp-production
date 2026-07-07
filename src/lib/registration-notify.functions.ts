import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { render } from '@react-email/components'
import { join } from 'path'

const EMAIL_IMG_DIR = () => join(process.cwd(), 'public', 'email-images')

const IMAGE_ATTACHMENTS = [
  { filename: 'qr-line-openchat.jpg', path: '', cid: 'qr-line-openchat' },
  { filename: 'banner-appstore.png', path: '', cid: 'banner-appstore' },
  { filename: 'banner-googleplay.png', path: '', cid: 'banner-googleplay' },
]

function getAttachments() {
  const dir = EMAIL_IMG_DIR()
  return IMAGE_ATTACHMENTS.map((a) => ({ ...a, path: join(dir, a.filename) }))
}

export const notifyRegistration = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as {
    training_ids: string[]
    institute_id: string
    guest_name: string
    guest_email: string
    student_id?: string | null
    wants_sim?: boolean | null
  })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { sendMail } = await import('@/lib/email/mailer.server')
    const { template: confirmTemplate } = await import('./email-templates/registration-confirmation')
    const { template: advisorTemplate } = await import('./email-templates/advisor-approval-request')

    const placeholders = data.training_ids.map(() => '?').join(',')
    const [trainingRows] = await pool.query(
      `SELECT title, start_date, end_date, location FROM trainings WHERE id IN (${placeholders}) ORDER BY start_date ASC`,
      data.training_ids
    )
    const trainings = trainingRows as { title: string; start_date: string; end_date: string | null; location: string | null }[]
    const mainTraining = trainings[0]
    const electivesCount = trainings.length - 1

    const fmt = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }) : undefined

    const siteUrl = process.env.SITE_URL ?? 'https://watercamp.kwunjai.com'
    const dashboardUrl = `${siteUrl}/advisor/dashboard`
    const attachments = getAttachments()

    // Email to student using React template with CID image attachments
    const studentHtml = await render(
      React.createElement(confirmTemplate.component, {
        name: data.guest_name,
        studentId: data.student_id || undefined,
        trainingTitle: mainTraining?.title,
        startDate: fmt(mainTraining?.start_date),
        endDate: fmt(mainTraining?.end_date),
        location: mainTraining?.location || undefined,
        electivesCount: electivesCount > 0 ? electivesCount : undefined,
        qrUrl: 'cid:qr-line-openchat',
        appStoreUrl: 'cid:banner-appstore',
        googlePlayUrl: 'cid:banner-googleplay',
      })
    )
    const studentSubject = typeof confirmTemplate.subject === 'function'
      ? confirmTemplate.subject({ trainingTitle: mainTraining?.title })
      : confirmTemplate.subject

    await sendMail({ to: data.guest_email, subject: studentSubject, html: studentHtml, attachments })

    // Find advisors for this institute
    const [advisorRows] = await pool.query(
      `SELECT full_name, email FROM advisors WHERE institute_id = ?`,
      [data.institute_id]
    )
    const advisors = advisorRows as { full_name: string; email: string }[]

    await Promise.all(advisors.map(async (advisor) => {
      const advisorHtml = await render(
        React.createElement(advisorTemplate.component, {
          advisorName: advisor.full_name,
          studentName: data.guest_name,
          studentEmail: data.guest_email,
          studentId: data.student_id || undefined,
          trainingTitle: mainTraining?.title,
          startDate: fmt(mainTraining?.start_date),
          endDate: fmt(mainTraining?.end_date),
          location: mainTraining?.location || undefined,
          approvalUrl: dashboardUrl,
        })
      )
      const advisorSubject = typeof advisorTemplate.subject === 'function'
        ? advisorTemplate.subject({ studentName: data.guest_name })
        : advisorTemplate.subject

      return sendMail({ to: advisor.email, subject: advisorSubject, html: advisorHtml })
        .catch((err) => console.error('Failed to notify advisor', advisor.email, err?.message))
    }))

    return { ok: true }
  })

export const notifyApproval = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { registration_id: string; status: 'approved' | 'rejected' })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { sendMail } = await import('@/lib/email/mailer.server')
    const { template: approvalTemplate } = await import('./email-templates/registration-approval-result')

    const [rows] = await pool.query(
      `SELECT r.guest_name, r.guest_email, t.title AS training_title, t.start_date, t.end_date, t.location
       FROM registrations r
       JOIN trainings t ON t.id = r.training_id
       WHERE r.id = ? LIMIT 1`,
      [data.registration_id]
    )
    const reg = (rows as any[])[0]
    if (!reg) return { ok: false }

    const fmt = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }) : undefined

    const attachments = data.status === 'approved' ? getAttachments() : []

    const approvalHtml = await render(
      React.createElement(approvalTemplate.component, {
        name: reg.guest_name,
        trainingTitle: reg.training_title,
        startDate: fmt(reg.start_date),
        endDate: fmt(reg.end_date),
        location: reg.location || undefined,
        status: data.status,
        qrUrl: 'cid:qr-line-openchat',
        appStoreUrl: 'cid:banner-appstore',
        googlePlayUrl: 'cid:banner-googleplay',
      })
    )
    const approvalSubject = typeof approvalTemplate.subject === 'function'
      ? approvalTemplate.subject({ status: data.status })
      : approvalTemplate.subject

    await sendMail({ to: reg.guest_email, subject: approvalSubject, html: approvalHtml, attachments })

    return { ok: true }
  })
