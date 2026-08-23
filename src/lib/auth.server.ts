import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { scrypt, randomBytes, timingSafeEqual, randomUUID, createHash } from 'crypto'
import { promisify } from 'util'
import pool from './db.server'
import { sendMail } from './email/mailer.server'
import { buildResetPasswordEmail } from './email/reset-password-template'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [salt, hash] = parts
  const hashBuf = Buffer.from(hash, 'hex')
  const buf = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(buf, hashBuf)
}

export type SessionUser = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'advisor' | 'student'
  institute_id: string | null
  institute_name: string | null
}

export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<SessionUser | null> => {
  const sessionId = getCookie('session')
  if (!sessionId) return null

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role,
            a.institute_id, COALESCE(i.institute, i.name) AS institute_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN advisors a ON a.email = u.email
     LEFT JOIN institutes_tab i ON i.id = a.institute_id
     WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1`,
    [sessionId],
  )
  const user = (rows as any[])[0]
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    institute_id: user.institute_id ?? null,
    institute_name: user.institute_name ?? null,
  }
})

export const login = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { email: string; password: string })
  .handler(async ({ data }) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [data.email])
    const user = (rows as any[])[0]
    if (!user) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    const ok = await verifyPassword(data.password, user.password_hash)
    if (!ok) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')

    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', [
      sessionId,
      user.id,
      expiresAt,
    ])

    setCookie('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return { id: user.id, email: user.email, full_name: user.full_name, role: user.role } as SessionUser
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const sessionId = getCookie('session')
  if (sessionId) {
    await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId])
  }
  deleteCookie('session', { path: '/' })
  return { ok: true }
})

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export const requestPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { email: string })
  .handler(async ({ data }) => {
    const [rows] = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = ? AND is_active = 1',
      [data.email],
    )
    const user = (rows as any[])[0]
    if (user) {
      const rawToken = randomBytes(32).toString('hex')
      const hashedToken = hashToken(rawToken)
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000)
      await pool.query(
        'UPDATE users SET reset_password_token = ?, reset_password_expires_at = ?, reset_token_used = FALSE WHERE id = ?',
        [hashedToken, expiresAt, user.id],
      )
      const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'
      const resetUrl = `${siteUrl}/reset-password?token=${rawToken}`
      await sendMail({
        to: user.email,
        subject: 'รีเซ็ตรหัสผ่าน — ศูนย์ฝึกอบรม คลังข้อมูลน้ำ',
        html: buildResetPasswordEmail({ fullName: user.full_name ?? null, resetUrl }),
      })
    }
    // Always return success to avoid leaking which emails exist
    return { ok: true }
  })

export const verifyResetToken = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { token: string })
  .handler(async ({ data }) => {
    if (!data.token) return { valid: false, reason: 'ไม่พบ token' }
    const hashed = hashToken(data.token)
    const [rows] = await pool.query(
      `SELECT id FROM users
       WHERE reset_password_token = ?
         AND reset_password_expires_at > NOW()
         AND reset_token_used = FALSE
         AND is_active = 1`,
      [hashed],
    )
    const user = (rows as any[])[0]
    if (!user) return { valid: false, reason: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' }
    return { valid: true }
  })

export const resetPassword = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { token: string; password: string })
  .handler(async ({ data }) => {
    if (!data.token) throw new Error('ไม่พบ token')
    if (data.password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    const hashed = hashToken(data.token)
    const [rows] = await pool.query(
      `SELECT id FROM users
       WHERE reset_password_token = ?
         AND reset_password_expires_at > NOW()
         AND reset_token_used = FALSE
         AND is_active = 1`,
      [hashed],
    )
    const user = (rows as any[])[0]
    if (!user) throw new Error('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว')
    const newHash = await hashPassword(data.password)
    await pool.query(
      `UPDATE users
       SET password_hash = ?, reset_token_used = TRUE,
           reset_password_token = NULL, reset_password_expires_at = NULL
       WHERE id = ?`,
      [newHash, user.id],
    )
    await pool.query('DELETE FROM sessions WHERE user_id = ?', [user.id])
    return { ok: true }
  })

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { email: string; password: string; full_name?: string; role?: 'admin' | 'advisor' | 'student' })
  .handler(async ({ data }) => {
    const hash = await hashPassword(data.password)
    const id = randomUUID()
    await pool.query('INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)', [
      id,
      data.email,
      hash,
      data.full_name ?? null,
      data.role ?? 'student',
    ])
    return { id, email: data.email }
  })
