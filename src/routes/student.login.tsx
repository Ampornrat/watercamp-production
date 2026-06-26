import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { Mail, KeyRound, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { requestStudentOTP, verifyStudentOTP } from '@/lib/student-auth.server'
import { getSession } from '@/lib/auth.server'

export const Route = createFileRoute('/student/login')({
  component: StudentLoginPage,
})

function StudentLoginPage() {
  const navigate = useNavigate()
  const getSessionFn = useServerFn(getSession)
  const requestOTPFn = useServerFn(requestStudentOTP)
  const verifyOTPFn = useServerFn(verifyStudentOTP)

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSessionFn().then((session) => {
      if (session?.role === 'student') navigate({ to: '/student/dashboard' })
    })
  }, [])

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestOTPFn({ data: { email: email.trim() } })
      setStep('otp')
    } catch (err: any) {
      setError(err?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOTPFn({ data: { email: email.trim(), otp: otp.trim() } })
      navigate({ to: '/student/dashboard' })
    } catch (err: any) {
      setError(err?.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md p-8">
          {step === 'email' ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">เข้าสู่ระบบนักเรียน</h1>
                  <p className="text-sm text-muted-foreground">ใช้อีเมลที่ใช้ลงทะเบียนเรียน</p>
                </div>
              </div>
              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <Label htmlFor="email">อีเมล</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="mt-1"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'กำลังส่งรหัส...' : 'รับรหัส OTP ทางอีเมล'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">ใส่รหัส OTP</h1>
                  <p className="text-sm text-muted-foreground">ส่งไปที่ {email}</p>
                </div>
              </div>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp">รหัส 6 หลัก</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="mt-1 text-center text-2xl tracking-[0.4em]"
                    required
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-muted-foreground">รหัสหมดอายุใน 10 นาที</p>
                </div>
                {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> ขอรหัสใหม่
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
      <SiteFooter />
    </div>
  )
}
