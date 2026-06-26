import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from 'crypto'
import { promisify } from 'util'
import pool from './db.server'

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
}

export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<SessionUser | null> => {
  const sessionId = getCookie('session')
  if (!sessionId) return null

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1`,
    [sessionId],
  )
  const user = (rows as any[])[0]
  return user ?? null
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
