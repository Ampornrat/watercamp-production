import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { getSession, login } from '@/lib/auth.server'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await getSession()
    if (user) throw redirect({ to: user.role === 'admin' ? '/admin' : '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const loginFn = useServerFn(login)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const user = await loginFn({ data: { email, password } })
      queryClient.setQueryData(['session'], user)
      toast.success('เข้าสู่ระบบสำเร็จ')
      navigate({ to: user.role === 'admin' ? '/admin' : '/' })
    } catch (err: any) {
      toast.error(err?.message ?? 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <Card className="w-full max-w-md rounded-3xl border-border bg-card p-8 shadow-soft">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Droplets className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">เข้าสู่ระบบ</h1>
          <p className="text-sm text-muted-foreground">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="กรอกอีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="กรอกรหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full rounded-xl bg-gradient-primary" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
