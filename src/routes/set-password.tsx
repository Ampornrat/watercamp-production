import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

// Server function: verify token and set password
const setPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => d as { token: string; password: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const { scrypt, randomBytes } = await import('crypto')
    const { promisify } = await import('util')
    const scryptAsync = promisify(scrypt)

    const [tokenRows] = await pool.query(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at
       FROM invite_tokens t
       WHERE t.id = ? LIMIT 1`,
      [data.token]
    )
    const token = (tokenRows as any[])[0]
    if (!token) throw new Error('ลิงก์ไม่ถูกต้อง')
    if (token.used_at) throw new Error('ลิงก์นี้ถูกใช้ไปแล้ว')
    if (new Date(token.expires_at) < new Date()) throw new Error('ลิงก์หมดอายุแล้ว')

    const salt = randomBytes(16).toString('hex')
    const hash = (await scryptAsync(data.password, salt, 64)) as Buffer
    const passwordHash = `${salt}:${hash.toString('hex')}`

    await pool.query(
      `UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?`,
      [passwordHash, token.user_id]
    )
    await pool.query(`UPDATE invite_tokens SET used_at = NOW() WHERE id = ?`, [token.id])

    return { ok: true }
  })

// Server function: check token validity
const checkTokenFn = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => d as { token: string })
  .handler(async ({ data }) => {
    const pool = (await import('@/lib/db.server')).default
    const [rows] = await pool.query(
      `SELECT t.id, t.expires_at, t.used_at, u.email, u.full_name
       FROM invite_tokens t JOIN users u ON u.id = t.user_id
       WHERE t.id = ? LIMIT 1`,
      [data.token]
    )
    const token = (rows as any[])[0]
    if (!token) return { valid: false, reason: 'ลิงก์ไม่ถูกต้อง' }
    if (token.used_at) return { valid: false, reason: 'ลิงก์นี้ถูกใช้ไปแล้ว' }
    if (new Date(token.expires_at) < new Date()) return { valid: false, reason: 'ลิงก์หมดอายุแล้ว' }
    return { valid: true, email: token.email as string, full_name: token.full_name as string | null }
  })

export const Route = createFileRoute('/set-password')({
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) ?? '' }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    if (!deps.token) return { valid: false, reason: 'ไม่พบ token' }
    return checkTokenFn({ data: { token: deps.token } })
  },
  component: SetPasswordPage,
})

function SetPasswordPage() {
  const { token } = Route.useSearch()
  const loaderData = Route.useLoaderData()
  const setPasswordServerFn = useServerFn(setPasswordFn)
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  if (!loaderData.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md rounded-3xl p-8 text-center">
          <KeyRound className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-heading text-xl font-bold text-foreground">ลิงก์ไม่ถูกต้อง</h1>
          <p className="mt-2 text-sm text-muted-foreground">{'reason' in loaderData ? loaderData.reason : ''}</p>
        </Card>
      </div>
    )
  }

  const validData = loaderData as { valid: true; email: string; full_name: string | null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (password !== confirm) return toast.error('รหัสผ่านไม่ตรงกัน')
    setLoading(true)
    try {
      await setPasswordServerFn({ data: { token, password } })
      toast.success('ตั้งรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบ')
      navigate({ to: '/login' })
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md rounded-3xl border-border bg-card p-8 shadow-soft">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">ตั้งรหัสผ่าน</h1>
          <p className="text-sm text-muted-foreground">
            สำหรับ {validData.full_name ?? validData.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password">รหัสผ่านใหม่</Label>
            <Input
              id="password"
              type="password"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-xl bg-gradient-primary" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านและเข้าสู่ระบบ'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
