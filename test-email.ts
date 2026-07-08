// @ts-nocheck
import * as React from 'react'
import { render } from '@react-email/components'
import { readFileSync } from 'fs'
import nodemailer from 'nodemailer'

// load .env manually
const envFile = readFileSync('.env', 'utf-8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^"|"$/g, '')
}

const TO = process.argv[2] || process.env.SMTP_USER

async function main() {
  const { template: confirmTemplate } = await import('./src/lib/email-templates/registration-confirmation')
  const { getEmailImageAttachments } = await import('./src/lib/email/email-images.server')

  const html = await render(
    React.createElement(confirmTemplate.component, {
      name: 'ทดสอบ ระบบ',
      studentId: '12345678',
      trainingTitle: 'การวิเคราะห์ข้อมูลน้ำเบื้องต้น',
      startDate: '15 มิถุนายน 2569 09:00 น.',
      endDate: '15 มิถุนายน 2569 16:00 น.',
      location: 'อาคารคลังข้อมูลน้ำแห่งชาติ กรุงเทพฯ',
      electivesCount: 1,
      qrUrl: 'cid:qr-line-openchat',
      appStoreUrl: 'cid:banner-appstore',
      googlePlayUrl: 'cid:banner-googleplay',
    })
  )

  const attachments = getEmailImageAttachments()

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  console.log(`Sending test email to: ${TO}`)
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: TO,
    subject: '[TEST] ยืนยันการลงทะเบียนหลักสูตร',
    html,
    attachments,
  })
  console.log('Done!')
}

main().catch((e) => { console.error(e); process.exit(1) })
