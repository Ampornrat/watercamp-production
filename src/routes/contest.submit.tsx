import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, FileVideo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listContestTeams, createContestUploadUrl, submitContestEntry } from "@/lib/contest.functions";

export const Route = createFileRoute("/contest/submit")({
  component: ContestSubmitPage,
});

function ContestSubmitPage() {
  const [teamId, setTeamId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const listTeams = useServerFn(listContestTeams);
  const createUpload = useServerFn(createContestUploadUrl);
  const submitEntry = useServerFn(submitContestEntry);

  const { data: teams } = useQuery({
    queryKey: ["contest-teams"],
    queryFn: () => listTeams(),
  });

  const selectedTeam = useMemo(
    () => teams?.find((t: { id: string }) => t.id === teamId),
    [teams, teamId],
  );
  void selectedTeam;

  const submit = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("กรุณาเลือกทีม");
      if (!campaignName.trim()) throw new Error("กรุณาระบุชื่อแคมเปญ");
      if (!file) throw new Error("กรุณาแนบไฟล์ผลงาน");
      if (file.size > 500 * 1024 * 1024) throw new Error("ไฟล์ต้องไม่เกิน 500MB");

      const safeName = file.name.replace(/[^\w.\- ]/g, "_");
      const { path, signedUrl } = await createUpload({
        data: { teamId, filename: safeName },
      });

      // Upload directly to storage via the signed upload URL.
      const upRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!upRes.ok) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");

      await submitEntry({
        data: {
          teamId,
          campaignName: campaignName.trim(),
          path,
          fileName: file.name,
          fileSize: file.size,
          note: note.trim() || null,
          submitterEmail: submitterEmail.trim().toLowerCase() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("ส่งผลงานเรียบร้อย ขอบคุณที่ร่วมประกวด!");
      setFile(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
              <div className="rounded-lg bg-teal/15 p-2 text-teal"><Upload className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">ส่งผลงานเข้าประกวด</h1>
                <p className="text-sm text-muted-foreground">เลือกทีมและแนบไฟล์ผลงาน (วิดีโอหรือไฟล์อื่นๆ ขนาดไม่เกิน 500MB)</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>เลือกทีม *</Label>
                <Select value={teamId} onValueChange={(v) => {
                  setTeamId(v);
                  const t = teams?.find((x: { id: string; campaign_name: string }) => x.id === v);
                  if (t) setCampaignName(t.campaign_name);
                }}>
                  <SelectTrigger><SelectValue placeholder="เลือกทีมที่ลงทะเบียนไว้" /></SelectTrigger>
                  <SelectContent>
                    {teams?.map((t: { id: string; team_name: string; campaign_name: string }) => (
                      <SelectItem key={t.id} value={t.id}>{t.team_name} — {t.campaign_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teams?.length === 0 && (
                  <p className="text-sm text-muted-foreground">ยังไม่มีทีมลงทะเบียน <Link to="/contest/register" className="text-teal underline">ลงทะเบียนทีมก่อน</Link></p>
                )}
              </div>

              <div className="space-y-2">
                <Label>ชื่อแคมเปญ *</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={200} />
              </div>

              <div className="space-y-2">
                <Label>อีเมลผู้ส่ง</Label>
                <Input type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} placeholder="ปล่อยว่างหากใช้อีเมลหัวหน้าทีม" />
              </div>

              <div className="space-y-2">
                <Label>ไฟล์ผลงาน *</Label>
                <div className="rounded-md border border-dashed p-4">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal file:px-4 file:py-2 file:font-semibold file:text-navy hover:file:bg-teal/90"
                    accept="video/*,application/pdf,image/*,.zip"
                  />
                  {file && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <FileVideo className="h-4 w-4" /> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>โน้ตเพิ่มเติม (ไม่บังคับ)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="ลิงก์ TikTok/Reels หรือคำอธิบายเพิ่มเติม" />
              </div>

              <Button
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="w-full bg-teal font-bold text-navy hover:bg-teal/90"
                size="lg"
              >
                {submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังอัปโหลด...</> : <><Upload className="h-4 w-4" /> ส่งผลงาน</>}
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
