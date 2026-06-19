import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Droplets } from "lucide-react";

export const Route = createFileRoute("/set-password")({
  head: () => ({ meta: [{ title: "ตั้งรหัสผ่าน | คลังข้อมูลน้ำแห่งชาติ" }] }),
  component: SetPassword,
});

function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase invite/recovery links land with tokens in the URL hash
    // and create a session automatically via detectSessionInUrl.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setHasSession(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (password !== confirm) return toast.error("รหัสผ่านไม่ตรงกัน");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("ตั้งรหัสผ่านสำเร็จ");
    navigate({ to: "/advisor/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-soft">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Droplets className="h-5 w-5" />
          </div>
          <span className="font-bold">คลังข้อมูลน้ำแห่งชาติ</span>
        </Link>
        <h1 className="mb-1 text-2xl font-bold">ตั้งรหัสผ่าน</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          กรุณาตั้งรหัสผ่านสำหรับเข้าใช้งานในครั้งถัดไป
        </p>

        {hasSession === false ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              ไม่พบการยืนยันตัวตน กรุณาเปิดลิงก์จากอีเมลเชิญอีกครั้ง หรือเข้าสู่ระบบ
            </p>
            <Link to="/login"><Button className="w-full">ไปหน้าเข้าสู่ระบบ</Button></Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">รหัสผ่านใหม่ *</Label>
              <Input id="password" type="password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirm">ยืนยันรหัสผ่าน *</Label>
              <Input id="confirm" type="password" required minLength={8}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading || !hasSession}>
              {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
