// @ts-nocheck
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import mysql from 'mysql2/promise'

// load .env manually
const envFile = readFileSync('.env', 'utf-8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^"|"$/g, '')
}

const SUBJECT = 'ใบรับรองการฝึกอบรมแลกเปลี่ยนเรียนรู้และการประยุกต์ใช้เทคโนโลยีด้านข้อมูลน้ำสู่ภาคการศึกษา'
const BODY_TEXT = 'นำส่งใบรับรองการฝึกอบรมแลกเปลี่ยนเรียนรู้และการประยุกต์ใช้เทคโนโลยีด้านข้อมูลน้ำสู่ภาคการศึกษา'

// parse args: --from TW-543
const fromArg = (() => {
  const i = process.argv.indexOf('--from')
  return i !== -1 ? process.argv[i + 1] : null
})()

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const [rows] = await db.execute(
    'SELECT `student_id`, `name`, `e-mail` FROM `student_data` ORDER BY `student_id`'
  )
  await db.end()

  let students = rows as any[]

  if (fromArg) {
    const startIndex = students.findIndex(s => s['student_id'] === fromArg)
    if (startIndex === -1) {
      console.error(`ไม่พบ student_id: ${fromArg}`)
      process.exit(1)
    }
    students = students.slice(startIndex)
    console.log(`เริ่มต่อจาก ${fromArg} — เหลือ ${students.length} คน\n`)
  } else {
    console.log(`ส่งทั้งหมด ${students.length} คน\n`)
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const htmlBody = `<p>${BODY_TEXT}</p>`

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const student of students) {
    const studentId: string = student['student_id']
    const email: string = student['e-mail']

    const certPath = path.resolve(`public/certresult/${studentId}.pdf`)
    if (!existsSync(certPath)) {
      console.warn(`[SKIP] ไม่พบไฟล์: ${studentId}.pdf`)
      skipped++
      continue
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: email,
        subject: SUBJECT,
        html: htmlBody,
        text: BODY_TEXT,
        attachments: [{ filename: `${studentId}.pdf`, path: certPath }],
      })
      sent++
      console.log(`[${sent}/${students.length}] ส่งแล้ว: ${studentId} → ${email}`)
    } catch (e: any) {
      const msg = `[ERROR] ${studentId} (${email}): ${e.message}`
      console.error(msg)
      errors.push(msg)
    }

    // หน่วงเล็กน้อยเพื่อไม่ให้โดน rate limit
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n========== สรุปผล ==========`)
  console.log(`ส่งสำเร็จ : ${sent} คน`)
  console.log(`ข้ามไฟล์  : ${skipped} คน`)
  console.log(`เกิดข้อผิดพลาด: ${errors.length} คน`)
  if (errors.length > 0) {
    console.log('\nรายการที่ผิดพลาด:')
    errors.forEach(e => console.log(' ', e))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
