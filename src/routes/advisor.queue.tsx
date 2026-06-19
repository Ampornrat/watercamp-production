import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { castAdvisorVote } from "@/lib/approvals.functions";

export const Route = createFileRoute("/advisor/queue")({
  component: AdvisorQueuePage,
});

type RegRow = {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_organization: string | null;
  advisor_email: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  trainings: { title: string | null; start_date: string | null } | null;
};

type VoteRow = {
  registration_id: string;
  advisor_id: string;
  decision: "approve" | "reject";
  note: string | null;
  advisor: { full_name: string | null; email: string } | null;
};

function AdvisorQueuePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const vote = useServerFn(castAdvisorVote);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const email = user?.email?.toLowerCase() ?? "";

  // Current advisor + institute
  const { data: me } = useQuery({
    queryKey: ["advisor-me", email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await supabase
        .from("advisors")
        .select("id, full_name, institute_id, role, institutes_tab:institute_id(institute)")
        .ilike("email", email)
        .maybeSingle();
      return data as any;
    },
  });

  // All advisors of my institute
  const { data: instAdvisors } = useQuery({
    queryKey: ["institute-advisors", me?.institute_id],
    enabled: !!me?.institute_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("advisors")
        .select("id, full_name, email, role")
        .eq("institute_id", me!.institute_id);
      return data ?? [];
    },
  });

  const advisorEmails = useMemo(
    () => (instAdvisors ?? []).map((a) => (a.email || "").toLowerCase()),
    [instAdvisors],
  );

  // Registrations of my institute (advisor_email is not collected at registration time)
  const { data: regs, isLoading: regsLoading } = useQuery<RegRow[]>({
    queryKey: ["queue-regs", me?.institute_id ?? ""],
    enabled: !!me?.institute_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, guest_name, guest_email, guest_phone, guest_organization, advisor_email, approval_status, created_at, trainings:training_id(title, start_date)")
        .eq("institute_id", me!.institute_id as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  // Votes for these registrations
  const regIds = useMemo(() => (regs ?? []).map((r) => r.id), [regs]);
  const { data: votes } = useQuery<VoteRow[]>({
    queryKey: ["queue-votes", regIds.join(",")],
    enabled: regIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("registration_approvals" as any)
        .select("registration_id, advisor_id, decision, note, advisor:advisor_id(full_name, email)")
        .in("registration_id", regIds);
      return (data ?? []) as any;
    },
  });

  const votesByReg = useMemo(() => {
    const map = new Map<string, VoteRow[]>();
    for (const v of votes ?? []) {
      const arr = map.get(v.registration_id) ?? [];
      arr.push(v);
      map.set(v.registration_id, arr);
    }
    return map;
  }, [votes]);

  const totalAdvisors = instAdvisors?.length ?? 0;

  const castVote = useMutation({
    mutationFn: async (input: { registrationId: string; decision: "approve" | "reject" }) =>
      vote({
        data: {
          registrationId: input.registrationId,
          decision: input.decision,
          note: notes[input.registrationId] || null,
        },
      }),
    onSuccess: (res, v) => {
      const verb = v.decision === "approve" ? "อนุมัติ" : "ไม่อนุมัติ";
      if (res.allVoted) {
        toast.success(
          `บันทึก${verb}แล้ว — ครบทุกท่าน: ${res.finalStatus === "approved" ? "สรุปอนุมัติ" : "สรุปไม่อนุมัติ"} (อนุมัติ ${res.approvals}/${res.totalAdvisors})`,
        );
      } else {
        toast.success(`บันทึก${verb}แล้ว (${res.votes}/${res.totalAdvisors} ท่าน)`);
      }
      qc.invalidateQueries({ queryKey: ["queue-votes"] });
      qc.invalidateQueries({ queryKey: ["queue-regs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || !user) {
    return <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>;
  }

  // Categorize
  const pending: RegRow[] = [];
  const finalized: RegRow[] = [];
  for (const r of regs ?? []) {
    const v = votesByReg.get(r.id) ?? [];
    if (v.length >= totalAdvisors && totalAdvisors > 0) finalized.push(r);
    else pending.push(r);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        <Link to="/advisor/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />กลับแดชบอร์ดอาจารย์
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">คิวอนุมัติผู้สมัครเรียน</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            สถาบัน: <span className="font-medium text-foreground">{me?.institutes_tab?.institute ?? "—"}</span>
            {" · "}อาจารย์ในสถาบัน: <span className="font-medium text-foreground">{totalAdvisors} ท่าน</span>
          </p>
          {!me && (
            <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/30">
              อีเมลนี้ยังไม่ได้ลงทะเบียนเป็นอาจารย์ —{" "}
              <Link to="/advisor/register" className="font-medium underline">ลงทะเบียนที่นี่</Link>
            </div>
          )}
        </div>

        <QueueSection
          title="รออนุมัติ"
          items={pending}
          votesByReg={votesByReg}
          totalAdvisors={totalAdvisors}
          meId={me?.id}
          notes={notes}
          setNotes={setNotes}
          onVote={(rid, d) => castVote.mutate({ registrationId: rid, decision: d })}
          isPending={castVote.isPending}
          loading={regsLoading}
          emptyText="ไม่มีนักศึกษารออนุมัติในขณะนี้"
        />

        <div className="mt-8">
          <QueueSection
            title="สรุปผลแล้ว"
            items={finalized}
            votesByReg={votesByReg}
            totalAdvisors={totalAdvisors}
            meId={me?.id}
            notes={notes}
            setNotes={setNotes}
            onVote={() => {}}
            isPending={false}
            loading={regsLoading}
            emptyText="ยังไม่มีรายการที่ครบทุกอาจารย์ลงคะแนน"
            readOnly
          />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function QueueSection({
  title, items, votesByReg, totalAdvisors, meId, notes, setNotes, onVote, isPending, loading, emptyText, readOnly,
}: {
  title: string;
  items: RegRow[];
  votesByReg: Map<string, VoteRow[]>;
  totalAdvisors: number;
  meId?: string;
  notes: Record<string, string>;
  setNotes: (n: Record<string, string>) => void;
  onVote: (rid: string, decision: "approve" | "reject") => void;
  isPending: boolean;
  loading: boolean;
  emptyText: string;
  readOnly?: boolean;
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="font-semibold">{title}</h2>
        <Badge variant="outline">{items.length} รายการ</Badge>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <ul className="divide-y">
          {items.map((r) => {
            const v = votesByReg.get(r.id) ?? [];
            const approvals = v.filter((x) => x.decision === "approve").length;
            const rejections = v.length - approvals;
            const myVote = meId ? v.find((x) => x.advisor_id === meId) : undefined;
            const allVoted = v.length >= totalAdvisors && totalAdvisors > 0;
            const finalApproved = allVoted && rejections === 0;
            return (
              <li key={r.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.guest_name || "—"}</span>
                      {allVoted ? (
                        finalApproved ? (
                          <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />อนุมัติ</Badge>
                        ) : (
                          <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />ไม่อนุมัติ</Badge>
                        )
                      ) : (
                        <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />รอ {totalAdvisors - v.length} ท่าน</Badge>
                      )}
                      {myVote && (
                        <Badge variant="secondary">
                          คุณลงคะแนน: {myVote.decision === "approve" ? "อนุมัติ" : "ไม่อนุมัติ"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {r.guest_email}{r.guest_phone ? ` · ${r.guest_phone}` : ""}
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-muted-foreground">หลักสูตร:</span>{" "}
                      <span className="font-medium">{r.trainings?.title ?? "—"}</span>
                    </div>
                    {r.guest_organization && (
                      <div className="text-xs text-muted-foreground">สังกัด: {r.guest_organization}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      ลงทะเบียน: {new Date(r.created_at).toLocaleString("th-TH")} · ระบุอาจารย์: {r.advisor_email}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3 flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Progress value={totalAdvisors ? (v.length / totalAdvisors) * 100 : 0} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {v.length}/{totalAdvisors} (อนุมัติ {approvals} · ไม่อนุมัติ {rejections})
                  </span>
                </div>

                {/* Per-advisor breakdown */}
                {v.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {v.map((x) => (
                      <span
                        key={x.advisor_id}
                        className={
                          "rounded-md border px-2 py-0.5 " +
                          (x.decision === "approve"
                            ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700/40 dark:bg-green-950/30 dark:text-green-200"
                            : "border-red-300 bg-red-50 text-red-800 dark:border-red-700/40 dark:bg-red-950/30 dark:text-red-200")
                        }
                        title={x.note || undefined}
                      >
                        {x.advisor?.full_name || x.advisor?.email || "อาจารย์"} · {x.decision === "approve" ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                )}

                {!readOnly && !allVoted && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="หมายเหตุ (ไม่บังคับ)"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onVote(r.id, "approve")}
                        disabled={isPending}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        {myVote?.decision === "approve" ? "อนุมัติ (อีกครั้ง)" : "อนุมัติ"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVote(r.id, "reject")}
                        disabled={isPending}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        {myVote?.decision === "reject" ? "ไม่อนุมัติ (อีกครั้ง)" : "ไม่อนุมัติ"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
