import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const getInstitutes = createServerFn({ method: 'GET' }).handler(async () => {
  const pool = (await import('@/lib/db.server')).default
  const [rows] = await pool.query(
    `SELECT id, institute FROM institutes_tab WHERE institute IS NOT NULL ORDER BY institute ASC`
  )
  return rows as { id: string; institute: string }[]
})

export const checkInstituteHasMainAdvisor = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { institute_id: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const [rows] = await pool.query(
      `SELECT id FROM advisors WHERE institute_id = ? AND role = 'main' LIMIT 1`,
      [data.institute_id]
    )
    return (rows as any[]).length > 0
  })

export const getInstituteJoinParticipation = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { institute_id: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const [rows] = await pool.query(
      `SELECT id FROM institute_participations WHERE institute_id = ? AND status = 'join' ORDER BY created_at DESC LIMIT 1`,
      [data.institute_id]
    )
    const row = (rows as any[])[0]
    return row ? { id: row.id as string } : null
  })

const Schema = z.object({
  full_name: z.string().min(1).max(255),
  position: z.string().min(1).max(255),
  faculty: z.string().min(1).max(255),
  institute_id: z.string().uuid(),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  role: z.enum(['main', 'assistant']),
  institute_participation_id: z.string().uuid().optional().nullable(),
  redirect_to: z.string().url().max(500).optional().nullable(),
})

export const registerAdvisor = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { randomBytes, scrypt } = await import('crypto')
    const { promisify } = await import('util')
    const { sendMail } = await import('@/lib/email/mailer.server')
    const scryptAsync = promisify(scrypt)

    const email = data.email.trim().toLowerCase()

    // Enforce role rules: only one 'main' per institute
    if (data.role === 'main') {
      const [existing] = await pool.query(
        `SELECT id FROM advisors WHERE institute_id = ? AND role = 'main' LIMIT 1`,
        [data.institute_id]
      )
      if ((existing as any[]).length > 0) {
        throw new Error('สถาบันนี้มีอาจารย์หลักแล้ว กรุณาเลือกบทบาทเป็นอาจารย์ผู้ช่วย')
      }
    }

    // Check duplicate advisor email
    const [dupRows] = await pool.query(
      `SELECT id FROM advisors WHERE LOWER(email) = ? LIMIT 1`,
      [email]
    )
    if ((dupRows as any[]).length > 0) throw new Error('อีเมลนี้ได้ลงทะเบียนเป็นอาจารย์แล้ว')

    // Insert advisor record
    const advisorId = randomUUID()
    try {
      await pool.query(
        `INSERT INTO advisors (id, full_name, position, faculty, institute_id, email, phone, address, postal_code, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          advisorId, data.full_name, data.position, data.faculty, data.institute_id,
          email, data.phone || null, data.address || null, data.postal_code || null, data.role,
        ]
      )
    } catch (err: any) {
      throw new Error(err?.message ?? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }

    // Create user account if not exists, then send invite email
    try {
      let userId: string
      const [userRows] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email])
      const existingUser = (userRows as any[])[0]

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Create user with a random locked password
        const salt = randomBytes(16).toString('hex')
        const hash = (await scryptAsync(randomBytes(32).toString('hex'), salt, 64)) as Buffer
        const passwordHash = `${salt}:${hash.toString('hex')}`
        userId = randomUUID()
        await pool.query(
          `INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 'advisor', 0)`,
          [userId, email, passwordHash, data.full_name]
        )
      }

      // Generate invite token (valid 7 days)
      const tokenId = randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await pool.query(
        `INSERT INTO invite_tokens (id, user_id, expires_at) VALUES (?, ?, ?)`,
        [tokenId, userId, expiresAt]
      )

      const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'
      const setPasswordUrl = `${siteUrl}/set-password?token=${tokenId}`

      await sendMail({
        to: email,
        subject: 'ตั้งรหัสผ่านเพื่อเข้าสู่ระบบ — ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ',
        html: `
          <div style="font-family:'Noto Sans Thai',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#0f172a">เรียนคุณ ${data.full_name}</h2>
            <p style="color:#334155;line-height:1.6">
              ขอบคุณที่ลงทะเบียนเป็นอาจารย์ที่ปรึกษากับ<strong>ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</strong>
            </p>
            <p style="color:#334155;line-height:1.6">
              กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านและเข้าสู่ระบบ ลิงก์นี้มีอายุ <strong>7 วัน</strong>
            </p>
            <div style="text-align:center;margin:32px 0">
              <a href="${setPasswordUrl}"
                 style="background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                ตั้งรหัสผ่าน
              </a>
            </div>
            <p style="color:#64748b;font-size:13px">
              หากไม่ได้ดำเนินการสมัคร กรุณาละเว้นอีเมลนี้<br>
              ลิงก์จะหมดอายุในวันที่ ${expiresAt.toLocaleDateString('th-TH', { dateStyle: 'long' })}
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#94a3b8;font-size:12px">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
          </div>
        `,
        text: `เรียนคุณ ${data.full_name}\n\nกรุณาตั้งรหัสผ่านที่: ${setPasswordUrl}\n\nลิงก์มีอายุ 7 วัน`,
      })
    } catch (emailErr: any) {
      // Email failure is non-fatal — advisor record already saved
      console.error('Failed to send invite email:', emailErr?.message)
    }

    return { id: advisorId }
  })
