import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, FileVideo, FileText, Clock } from "lucide-react";
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [storyboardFile, setStoryboardFile] = useState<File | null>(null);
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

  const isApproved = selectedTeam?.round1_status === "approved";

  const submit = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("กรุณาเลือกทีม");
      if (!isApproved) throw new Error("ทีมนี้ยังไม่ผ่านการคัดเลือกรอบที่ 1");
      if (!campaignName.trim()) throw new Error("กรุณาระบุชื่อแคมเปญ");

      if (!videoFile) throw new Error("กรุณาแนบไฟล์ VDO Clip (.mp4)");
      if (!/\.mp4$/i.test(videoFile.name)) throw new Error("ไฟล์ VDO ต้องเป็นนามสกุล .mp4 เท่านั้น");
      if (videoFile.size > 500 * 1024 * 1024) throw new Error("ไฟล์ VDO ต้องไม่เกิน 500MB");

      if (!storyboardFile) throw new Error("กรุณาแนบไฟล์ Story Board (.pdf)");
      if (!/\.pdf$/i.test(storyboardFile.name) && storyboardFile.type !== "application/pdf")
        throw new Error("Story Board ต้องเป็นไฟล์ PDF เท่านั้น");
      if (storyboardFile.size > 100 * 1024 * 1024) throw new Error("ไฟล์ Story Board ต้องไม่เกิน 100MB");

      const safeVideo = videoFile.name.replace(/[^\w.\- ]/g, "_");
      const { path: videoPath, signedUrl: videoUrl } = await createUpload({ data: { teamId, filename: safeVideo } });
      const upVideo = await fetch(videoUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: videoFile,
      });
      if (!upVideo.ok) throw new Error("อัปโหลดไฟล์ VDO ไม่สำเร็จ");

      const safeSb = `storyboard_r2_${storyboardFile.name.replace(/[^\w.\- ]/g, "_")}`;
      const { path: sbPath, signedUrl: sbUrl } = await createUpload({ data: { teamId, filename: safeSb } });
      const upSb = await fetch(sbUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: storyboardFile,
      });
      if (!upSb.ok) throw new Error("อัปโหลดไฟล์ Story Board ไม่สำเร็จ");

      await submitEntry({
        data: {
          teamId,
          campaignName: campaignName.trim(),
          path: videoPath,
          fileName: videoFile.name,
          fileSize: videoFile.size,
          storyboardPath: sbPath,
          storyboardFileName: storyboardFile.name,
          storyboardFileSize: storyboardFile.size,
          note: note.trim() || null,
          submitterEmail: submitterEmail.trim().toLowerCase() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("ส่งผลงานรอบที่ 2 เรียบร้อย ขอบคุณที่ร่วมประกวด!");
      setVideoFile(null);
      setStoryboardFile(null);
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
                <h1 className="font-heading text-2xl font-extrabold">ส่งผลงานรอบที่ 2</h1>
                <p className="text-sm text-muted-foreground">สำหรับทีมที่ผ่านการคัดเลือกรอบที่ 1 เท่านั้น</p>
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
                    {teams?.map((t: { id: string; team_name: string; campaign_name: string; round1_status: string }) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.team_name} — {t.campaign_name}
                        {t.round1_status === "approved" ? " ✅" : t.round1_status === "rejected" ? " ❌" : " ⏳"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teams?.length === 0 && (
                  <p className="text-sm text-muted-foreground">ยังไม่มีทีมลงทะเบียน <Link to="/contest/register" className="text-teal underline">ลงทะเบียนทีมก่อน</Link></p>
                )}
              </div>

              {/* Status message when team is selected but not approved */}
              {teamId && !isApproved && (
                <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                  <Clock className="h-5 w-5 shrink-0 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      {selectedTeam?.round1_status === "rejected"
                        ? "ทีมนี้ไม่ผ่านการคัดเลือกรอบที่ 1"
                        : "รอผลการคัดเลือกรอบที่ 1"}
                    </p>
                    <p className="text-sm text-yellow-700">
                      {selectedTeam?.round1_status === "rejected"
                        ? "ขออภัย ทีมของท่านไม่ผ่านการพิจารณารอบที่ 1"
                        : "กรรมการกำลังตรวจสอบ Story Board รอบที่ 1 จะแจ้งผลทาง email"}
                    </p>
                  </div>
                </div>
              )}

              {/* Upload form — only shown for approved teams */}
              {isApproved && (
                <>
                  <div className="space-y-2">
                    <Label>ชื่อแคมเปญ *</Label>
                    <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={200} />
                  </div>

                  <div className="space-y-2">
                    <Label>อีเมลผู้ส่ง</Label>
                    <Input type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} placeholder="ปล่อยว่างหากใช้อีเมลหัวหน้าทีม" />
                  </div>

                  <div className="space-y-2">
                    <Label>VDO Clip * (ไฟล์ .mp4 เท่านั้น ไม่เกิน 500MB)</Label>
                    <div className="rounded-md border border-dashed p-4">
                      <input
                        type="file"
                        accept=".mp4,video/mp4"
                        onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal file:px-4 file:py-2 file:font-semibold file:text-navy hover:file:bg-teal/90"
                      />
                      {videoFile && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <FileVideo className="h-4 w-4" /> {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Story Board ที่ปรับปรุงแล้ว * (ไฟล์ .pdf เท่านั้น ไม่เกิน 100MB)</Label>
                    <div className="rounded-md border border-dashed p-4">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => setStoryboardFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal file:px-4 file:py-2 file:font-semibold file:text-navy hover:file:bg-teal/90"
                      />
                      {storyboardFile && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" /> {storyboardFile.name} ({(storyboardFile.size / 1024 / 1024).toFixed(2)} MB)
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
                    {submit.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังอัปโหลด...</>
                      : <><Upload className="h-4 w-4" /> ส่งผลงานรอบที่ 2</>}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
