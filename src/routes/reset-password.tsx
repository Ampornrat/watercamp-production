import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { verifyResetToken, resetPassword } from '@/lib/auth.server'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) ?? '' }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    if (!deps.token) return { valid: false, reason: 'ไม่พบ token' }
    return verifyResetToken({ data: { token: deps.token } })
  },
  component: ResetPasswordPage,
})

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

function getPasswordStrength(password: string): { level: StrengthLevel; label: string; color: string; width: string } {
  if (password.length === 0) return { level: 'weak', label: '', color: 'bg-transparent', width: 'w-0' }
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  const score = [password.length >= 8, hasLower || hasUpper, hasDigit, hasSpecial, password.length >= 12].filter(Boolean).length

  if (score <= 1) return { level: 'weak', label: 'อ่อนแอ', color: 'bg-red-500', width: 'w-1/4' }
  if (score === 2) return { level: 'fair', label: 'พอใช้', color: 'bg-orange-400', width: 'w-2/4' }
  if (score === 3) return { level: 'good', label: 'ดี', color: 'bg-yellow-400', width: 'w-3/4' }
  return { level: 'strong', label: 'แข็งแกร่ง', color: 'bg-green-500', width: 'w-full' }
}

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const loaderData = Route.useLoaderData()
  const resetFn = useServerFn(resetPassword)
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(password)

  if (!loaderData.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md rounded-3xl p-8 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">ลิงก์ไม่ถูกต้อง</h1>
          <p className="text-sm text-muted-foreground">{'reason' in loaderData ? loaderData.reason : ''}</p>
          <a
            href="/forgot-password"
            className="inline-block mt-2 text-sm font-medium text-primary hover:underline"
          >
            ขอลิงก์รีเซ็ตรหัสผ่านใหม่
          </a>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (password !== confirm) return toast.error('รหัสผ่านไม่ตรงกัน')
    setLoading(true)
    try {
      await resetFn({ data: { token, password } })
      toast.success('รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่')
      navigate({ to: '/login' })
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
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
          <h1 className="font-heading text-2xl font-extrabold text-foreground">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-muted-foreground">รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">รหัสผ่านใหม่</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                  />
                </div>
                <p className={`text-xs font-medium ${
                  strength.level === 'strong' ? 'text-green-600' :
                  strength.level === 'good' ? 'text-yellow-600' :
                  strength.level === 'fair' ? 'text-orange-500' : 'text-red-500'
                }`}>
                  ความปลอดภัย: {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="pr-10"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
            )}
            {confirm.length > 0 && password === confirm && (
              <p className="text-xs text-green-600">รหัสผ่านตรงกัน</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl bg-gradient-primary"
            disabled={loading || password !== confirm || password.length < 8}
          >
            {loading ? 'กำลังบันทึก...' : 'ยืนยันรหัสผ่านใหม่'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
