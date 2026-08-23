import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import { Droplets, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { requestPasswordReset } from '@/lib/auth.server'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const requestReset = useServerFn(requestPasswordReset)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await requestReset({ data: { email } })
      setSent(true)
    } catch (err: any) {
      toast.error(err?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md rounded-3xl border-border bg-card p-8 shadow-soft">
        {sent ? (
          <SuccessView email={email} />
        ) : (
          <RequestView
            email={email}
            setEmail={setEmail}
            loading={loading}
            onSubmit={handleSubmit}
          />
        )}
      </Card>
    </div>
  )
}

function RequestView({
  email,
  setEmail,
  loading,
  onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Droplets className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">ลืมรหัสผ่าน?</h1>
        <p className="text-sm text-muted-foreground">
          กรอกอีเมลที่ลงทะเบียนไว้ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้ภายใน 20 นาที
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="กรอกอีเมลของคุณ"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full rounded-xl bg-gradient-primary" disabled={loading}>
          {loading ? 'กำลังส่งอีเมล...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </>
  )
}

function SuccessView({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle className="h-8 w-8" />
      </div>
      <h2 className="font-heading text-xl font-bold text-foreground">ตรวจสอบอีเมลของคุณ</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        หากอีเมล <strong className="text-foreground">{email}</strong> มีในระบบ
        คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านภายในไม่กี่นาที
      </p>
      <div className="mt-2 w-full rounded-xl border border-blue-100 bg-blue-50 p-4 text-left text-xs text-blue-700 space-y-1">
        <p className="font-semibold">เคล็ดลับ:</p>
        <p>• ลิงก์มีอายุ 20 นาที หลังจากนั้นจะหมดอายุ</p>
        <p>• ตรวจสอบโฟลเดอร์ Spam หากไม่พบในกล่องจดหมาย</p>
        <p>• ลิงก์ใช้ได้เพียงครั้งเดียวเท่านั้น</p>
      </div>
      <Link
        to="/login"
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </div>
  )
}
