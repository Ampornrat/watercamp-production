import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import pool from './db.server'

export const requestStudentOTP = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { email: string })
  .handler(async ({ data }) => {
    const { sendMail } = await import('@/lib/email/mailer.server')
    const email = data.email.trim().toLowerCase()

    const [found] = await pool.query(
      `SELECT email FROM student_profiles WHERE email = ?
       UNION
       SELECT LOWER(guest_email) FROM registrations WHERE LOWER(guest_email) = ? LIMIT 1`,
      [email, email]
    )
    if ((found as any[]).length === 0) {
      throw new Error('ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลที่ใช้ลงทะเบียนเรียน')
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await pool.query(
      `INSERT INTO student_otp (email, otp, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at), created_at = NOW()`,
      [email, otp, expiresAt]
    )

    await sendMail({
      to: email,
      subject: 'รหัส OTP เข้าสู่ระบบ — ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ',
      html: `
        <div style="font-family:'Noto Sans Thai',Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0f172a">รหัสเข้าสู่ระบบของท่าน</h2>
          <div style="text-align:center;margin:28px 0">
            <span style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#0ea5e9">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center">รหัสนี้ใช้ได้ครั้งเดียวและหมดอายุภายใน <strong>10 นาที</strong></p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
        </div>
      `,
      text: `รหัสเข้าสู่ระบบ: ${otp} (หมดอายุใน 10 นาที)`,
    })

    return { ok: true }
  })

export const verifyStudentOTP = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { email: string; otp: string })
  .handler(async ({ data }) => {
    const { randomUUID } = await import('crypto')
    const email = data.email.trim().toLowerCase()

    const [otpRows] = await pool.query(
      `SELECT otp, expires_at FROM student_otp WHERE email = ? LIMIT 1`,
      [email]
    )
    const record = (otpRows as any[])[0]
    if (!record) throw new Error('ไม่พบรหัส OTP กรุณาขอรหัสใหม่')
    if (new Date(record.expires_at) < new Date()) {
      await pool.query(`DELETE FROM student_otp WHERE email = ?`, [email])
      throw new Error('รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่')
    }
    if (record.otp !== data.otp.trim()) throw new Error('รหัส OTP ไม่ถูกต้อง')

    await pool.query(`DELETE FROM student_otp WHERE email = ?`, [email])

    const [userRows] = await pool.query(
      `SELECT id, email, full_name, role FROM users WHERE email = ? AND is_active = 1 LIMIT 1`,
      [email]
    )
    let user = (userRows as any[])[0]

    if (!user) {
      const [profileRows] = await pool.query(
        `SELECT full_name FROM student_profiles WHERE email = ? LIMIT 1`,
        [email]
      )
      const profile = (profileRows as any[])[0]
      const userId = randomUUID()
      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, 'otp_login', ?, 'student')`,
        [userId, email, profile?.full_name ?? null]
      )
      user = { id: userId, email, full_name: profile?.full_name ?? null, role: 'student' }
    } else if (user.role !== 'student') {
      throw new Error('บัญชีนี้ไม่ใช่บัญชีนักเรียน กรุณาใช้หน้า Login ปกติ')
    }

    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await pool.query('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', [
      sessionId, user.id, expiresAt,
    ])

    setCookie('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return { id: user.id, email: user.email, full_name: user.full_name, role: 'student' as const }
  })
