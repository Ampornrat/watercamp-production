import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/advisor/dashboard")({
  component: AdvisorDashboardPage,
});

function AdvisorDashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const email = user?.email?.toLowerCase() ?? "";

  const { data: advisor } = useQuery({
    queryKey: ["advisor-me", email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await supabase
        .from("advisors")
        .select("id, full_name, email, institute_id, institutes_tab:institute_id(institute)")
        .ilike("email", email)
        .maybeSingle();
      return data;
    },
  });

  const { data: regs, isLoading } = useQuery({
    queryKey: ["advisor-regs", advisor?.institute_id ?? ""],
    enabled: !!advisor?.institute_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, guest_name, guest_email, advisor_email, approval_status, created_at, approved_at, trainings:training_id(title, start_date)")
        .eq("institute_id", advisor!.institute_id as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("registrations")
        .update({
          approval_status: status,
          approved_at: new Date().toISOString(),
          approved_by_advisor_id: advisor?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "approved" ? "อนุมัติเรียบร้อย" : "ปฏิเสธเรียบร้อย");
      qc.invalidateQueries({ queryKey: ["advisor-regs", email] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || !user) {
    return <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />กลับหน้าแรก
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">ระบบอนุมัติของอาจารย์ที่ปรึกษา</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            อีเมลที่เข้าระบบ: <span className="font-medium text-foreground">{user.email}</span>
          </p>
          {!advisor && (
            <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm text-foreground dark:border-amber-500/30 dark:bg-amber-950/30">
              อีเมลนี้ยังไม่ได้ลงทะเบียนเป็นอาจารย์ที่ปรึกษา —{" "}
              <Link to="/advisor/register" className="font-medium underline">ลงทะเบียนที่นี่</Link>
            </div>
          )}
        </div>

        <Card className="p-0">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">นักศึกษาในความดูแล ({regs?.length ?? 0})</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
          ) : !regs || regs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              ยังไม่มีนักศึกษาที่กรอกอีเมลของท่านเป็นอาจารย์ที่ปรึกษา
            </div>
          ) : (
            <ul className="divide-y">
              {regs.map((r: any) => {
                const status = r.approval_status as "pending" | "approved" | "rejected";
                return (
                  <li key={r.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{r.guest_name || "—"}</span>
                        {status === "pending" && <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />รออนุมัติ</Badge>}
                        {status === "approved" && <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />อนุมัติแล้ว</Badge>}
                        {status === "rejected" && <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />ปฏิเสธ</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{r.guest_email}</div>
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">หลักสูตร:</span>{" "}
                        <span className="font-medium text-foreground">{r.trainings?.title ?? "—"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ลงทะเบียน: {new Date(r.created_at).toLocaleString("th-TH")}
                      </div>
                    </div>
                    {status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateApproval.mutate({ id: r.id, status: "approved" })}
                          disabled={updateApproval.isPending}
                        >
                          อนุมัติ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateApproval.mutate({ id: r.id, status: "rejected" })}
                          disabled={updateApproval.isPending}
                        >
                          ปฏิเสธ
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
