import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Calendar, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "การลงทะเบียนของฉัน" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  const { data, refetch } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, trainings(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancelReg = async (id: string) => {
    const { error } = await supabase.from("registrations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("ยกเลิกแล้ว"); refetch(); }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">การลงทะเบียนของฉัน</h1>
        <p className="mt-1 text-muted-foreground">รายการหลักสูตรที่คุณลงทะเบียนไว้</p>

        <div className="mt-8 space-y-4">
          {!data || data.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">ยังไม่มีการลงทะเบียน</p>
              <Link to="/trainings"><Button className="mt-4">ดูหลักสูตร</Button></Link>
            </Card>
          ) : (
            data.map((r) => (
              <Card key={r.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
                      {r.status === "pending" ? "รอยืนยัน" : r.status === "confirmed" ? "ยืนยันแล้ว" : r.status}
                    </Badge>
                    {r.trainings?.course_type === "core"
                      ? <Badge variant="outline">หลักสูตรหลัก</Badge>
                      : <Badge variant="outline">เสริมทักษะ</Badge>}
                    {r.completion_status === "completed" && <Badge className="bg-green-600 hover:bg-green-600">ผ่านแล้ว</Badge>}
                    {r.completion_status === "failed" && <Badge variant="destructive">ไม่ผ่าน</Badge>}
                    {(!r.completion_status || r.completion_status === "enrolled") && <Badge variant="secondary">กำลังเรียน</Badge>}
                  </div>
                  <h3 className="mt-2 font-semibold">{r.trainings?.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{r.trainings && new Date(r.trainings.start_date).toLocaleDateString("th-TH")}</span>
                    {r.trainings?.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.trainings.location}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.trainings && <Link to="/trainings/$id" params={{ id: r.trainings.id }}><Button variant="outline" size="sm">ดูรายละเอียด</Button></Link>}
                  <Button variant="ghost" size="sm" onClick={() => cancelReg(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
