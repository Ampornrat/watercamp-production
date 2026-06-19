import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "สมัครสมาชิก | คลังข้อมูลน้ำแห่งชาติ" }] }),
  component: Signup,
});

function Signup() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", organization: "", position: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: form.full_name,
          organization: form.organization,
          position: form.position,
          phone: form.phone,
          role: "student",
        },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี");
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4 py-10">
      <Card className="w-full max-w-md p-8 shadow-soft">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Droplets className="h-5 w-5" />
          </div>
          <span className="font-bold">คลังข้อมูลน้ำแห่งชาติ</span>
        </Link>
        <h1 className="mb-1 text-2xl font-bold">สมัครสมาชิก</h1>
        <p className="mb-6 text-sm text-muted-foreground">สร้างบัญชีเพื่อลงทะเบียนหลักสูตร</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div><Label htmlFor="full_name">ชื่อ-นามสกุล *</Label><Input id="full_name" required value={form.full_name} onChange={set("full_name")} /></div>
          <div><Label htmlFor="email">อีเมล *</Label><Input id="email" type="email" required value={form.email} onChange={set("email")} /></div>
          <div><Label htmlFor="password">รหัสผ่าน *</Label><Input id="password" type="password" required minLength={6} value={form.password} onChange={set("password")} /></div>
          <div><Label htmlFor="organization">หน่วยงาน</Label><Input id="organization" value={form.organization} onChange={set("organization")} /></div>
          <div><Label htmlFor="position">ตำแหน่ง</Label><Input id="position" value={form.position} onChange={set("position")} /></div>
          <div><Label htmlFor="phone">เบอร์โทร</Label><Input id="phone" value={form.phone} onChange={set("phone")} /></div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          มีบัญชีแล้ว? <Link to="/login" className="font-medium text-primary hover:underline">เข้าสู่ระบบ</Link>
        </p>
      </Card>
    </div>
  );
}
