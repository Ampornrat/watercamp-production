import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import pool from './db.server'

export const assertAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const sessionId = getCookie('session')
  if (!sessionId) throw new Error('Unauthorized')

  const [rows] = await pool.query(
    `SELECT u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1`,
    [sessionId],
  )
  const user = (rows as any[])[0]
  if (!user || user.role !== 'admin') throw new Error('Forbidden')
  return { ok: true }
})
