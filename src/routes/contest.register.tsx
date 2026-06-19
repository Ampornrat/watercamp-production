import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { registerContestTeam } from "@/lib/contest.functions";

export const Route = createFileRoute("/contest/register")({
  component: ContestRegisterPage,
});

type EligibleRow = {
  registration_id: string;
  name: string;
  email: string;
  institute_id: string;
};

function ContestRegisterPage() {
  const navigate = useNavigate();
  const registerTeam = useServerFn(registerContestTeam);
  const [instituteId, setInstituteId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [concept, setConcept] = useState("");

  const { data: institutes } = useQuery({
    queryKey: ["institutes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutes_tab").select("id, institute").order("institute");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: eligible, isLoading: loadingEligible } = useQuery({
    queryKey: ["eligible-trainees", instituteId],
    enabled: !!instituteId,
    queryFn: async (): Promise<EligibleRow[]> => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, guest_name, guest_email, institute_id, completion_status")
        .eq("institute_id", instituteId)
        .in("completion_status", ["enrolled", "completed"]);
      if (error) throw error;
      // dedupe by email
      const seen = new Set<string>();
      const rows: EligibleRow[] = [];
      for (const r of data ?? []) {
        const email = (r.guest_email ?? "").toLowerCase();
        if (!email || seen.has(email)) continue;
        seen.add(email);
        rows.push({
          registration_id: r.id,
          name: r.guest_name ?? email,
          email,
          institute_id: r.institute_id!,
        });
      }
      return rows;
    },
  });

  const leader = useMemo(() => eligible?.find((e) => e.registration_id === leaderId), [eligible, leaderId]);
  const memberCandidates = useMemo(
    () => (eligible ?? []).filter((e) => e.registration_id !== leaderId),
    [eligible, leaderId],
  );

  const submit = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error("กรุณากรอกชื่อทีม");
      if (!instituteId) throw new Error("กรุณาเลือกสถาบัน");
      if (!leader) throw new Error("กรุณาเลือกหัวหน้าทีม");
      if (memberIds.length === 0) throw new Error("กรุณาเลือกสมาชิกทีมอย่างน้อย 1 คน");
      if (!campaignName.trim()) throw new Error("กรุณากรอกชื่อแคมเปญ");
      if (!concept.trim()) throw new Error("กรุณากรอกคอนเซป");

      const res = await registerTeam({
        data: {
          teamName: teamName.trim(),
          instituteId,
          leaderRegistrationId: leader.registration_id,
          memberRegistrationIds: memberIds,
          campaignName: campaignName.trim(),
          concept: concept.trim(),
        },
      });
      return res.id;
    },
    onSuccess: () => {
      toast.success("ลงทะเบียนทีมเรียบร้อย พร้อมส่งผลงานได้แล้ว");
      navigate({ to: "/contest/submit" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/contest" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับไปกติกา
          </Link>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-teal/15 p-2 text-teal"><Users className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">ลงทะเบียนทีมส่งผลงาน</h1>
                <p className="text-sm text-muted-foreground">เฉพาะผู้ที่ลงทะเบียนหลักสูตรของสถาบันแล้ว</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>ชื่อทีม *</Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="เช่น Water Warriors" maxLength={120} />
              </div>

              <div className="space-y-2">
                <Label>สถาบัน *</Label>
                <Select value={instituteId} onValueChange={(v) => { setInstituteId(v); setLeaderId(""); setMemberIds([]); }}>
                  <SelectTrigger><SelectValue placeholder="เลือกสถาบัน" /></SelectTrigger>
                  <SelectContent>
                    {institutes?.map((i) => <SelectItem key={i.id} value={i.id}>{i.institute}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {instituteId && (
                <>
                  <div className="space-y-2">
                    <Label>หัวหน้าทีม *</Label>
                    {loadingEligible ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายชื่อผู้ผ่านการอบรม...</div>
                    ) : (eligible?.length ?? 0) === 0 ? (
                      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">ยังไม่มีผู้ผ่านการอบรมจากสถาบันนี้</p>
                    ) : (
                      <Select value={leaderId} onValueChange={(v) => { setLeaderId(v); setMemberIds((m) => m.filter((x) => x !== v)); }}>
                        <SelectTrigger><SelectValue placeholder="เลือกหัวหน้าทีม" /></SelectTrigger>
                        <SelectContent>
                          {eligible!.map((e) => (
                            <SelectItem key={e.registration_id} value={e.registration_id}>{e.name} ({e.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {leaderId && memberCandidates.length > 0 && (
                    <div className="space-y-2">
                      <Label>สมาชิกในทีม * (เลือกได้หลายคน)</Label>
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                        {memberCandidates.map((m) => (
                          <label key={m.registration_id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                            <Checkbox
                              checked={memberIds.includes(m.registration_id)}
                              onCheckedChange={() => toggleMember(m.registration_id)}
                            />
                            <div className="text-sm"><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.email}</div></div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>ชื่อแคมเปญ *</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="เช่น ThaiWater รู้ทันฝน" maxLength={200} />
              </div>

              <div className="space-y-2">
                <Label>คอนเซป (บรรยายพอสังเขป) *</Label>
                <Textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={5} maxLength={1500} placeholder="อธิบายแนวคิดของแคมเปญ..." />
              </div>

              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="w-full bg-teal font-bold text-navy hover:bg-teal/90"
                size="lg"
              >
                {submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...</> : "ลงทะเบียนทีม"}
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
