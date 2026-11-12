import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, FileVideo, FileText, Clock, XCircle, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSession } from "@/lib/auth.server";
import { getMyContestTeam, createContestUploadUrl, submitContestEntry } from "@/lib/contest.functions";

export const Route = createFileRoute("/contest/submit")({
  component: ContestSubmitPage,
});

function ContestSubmitPage() {
  const navigate = useNavigate()
  const getSessionFn = useServerFn(getSession)
  const getMyTeamFn = useServerFn(getMyContestTeam)
  const createUpload = useServerFn(createContestUploadUrl)
  const submitEntry = useServerFn(submitContestEntry)

  const [sessionUser, setSessionUser] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [campaignName, setCampaignName] = useState("")
  const [note, setNote] = useState("")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [storyboardFile, setStoryboardFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getSessionFn()
      .then(async (session) => {
        if (!session || session.role !== 'student') {
          // redirect to login, come back here after
          navigate({ to: '/student/login' })
          return
        }
        setSessionUser(session)
        const myTeam = await getMyTeamFn({ data: { email: session.email } })
        setTeam(myTeam)
        if (myTeam?.campaign_name) setCampaignName(myTeam.campaign_name)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  const submit = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error('ไม่พบข้อมูลทีม')
      if (team.round1_status !== 'approved') throw new Error('ทีมยังไม่ผ่านการคัดเลือกรอบที่ 1')
      if (!campaignName.trim()) throw new Error('กรุณาระบุชื่อแคมเปญ')
      if (!videoFile) throw new Error('กรุณาแนบไฟล์ VDO Clip (.mp4)')
      if (!/\.mp4$/i.test(videoFile.name)) throw new Error('ไฟล์ VDO ต้องเป็นนามสกุล .mp4 เท่านั้น')
      if (videoFile.size > 500 * 1024 * 1024) throw new Error('ไฟล์ VDO ต้องไม่เกิน 500MB')
      if (!storyboardFile) throw new Error('กรุณาแนบไฟล์ Story Board (.pdf)')
      if (!/\.pdf$/i.test(storyboardFile.name) && storyboardFile.type !== 'application/pdf')
        throw new Error('Story Board ต้องเป็นไฟล์ PDF เท่านั้น')
      if (storyboardFile.size > 100 * 1024 * 1024) throw new Error('ไฟล์ Story Board ต้องไม่เกิน 100MB')

      // Decode URL-encoded filenames (some browsers report file.name as encoded)
      let videoOrigName: string
      try { videoOrigName = decodeURIComponent(videoFile.name) } catch { videoOrigName = videoFile.name }
      let sbOrigName: string
      try { sbOrigName = decodeURIComponent(storyboardFile.name) } catch { sbOrigName = storyboardFile.name }

      const safeVideo = videoOrigName.replace(/[^\w.\- ]/g, '_')
      const { path: videoPath, signedUrl: videoUrl } = await createUpload({ data: { teamId: team.id, filename: safeVideo } })
      const upVideo = await fetch(videoUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: videoFile })
      if (!upVideo.ok) throw new Error('อัปโหลดไฟล์ VDO ไม่สำเร็จ')

      const safeSb = `storyboard_r2_${sbOrigName.replace(/[^\w.\- ]/g, '_')}`
      const { path: sbPath, signedUrl: sbUrl } = await createUpload({ data: { teamId: team.id, filename: safeSb } })
      const upSb = await fetch(sbUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: storyboardFile })
      if (!upSb.ok) throw new Error('อัปโหลดไฟล์ Story Board ไม่สำเร็จ')

      await submitEntry({
        data: {
          teamId: team.id,
          campaignName: campaignName.trim(),
          path: videoPath,
          fileName: videoOrigName,
          fileSize: videoFile.size,
          storyboardPath: sbPath,
          storyboardFileName: sbOrigName,
          storyboardFileSize: storyboardFile.size,
          note: note.trim() || null,
          submitterEmail: sessionUser?.email ?? null,
        },
      })
    },
    onSuccess: () => {
      toast.success('ส่งผลงานรอบที่ 2 เรียบร้อย ขอบคุณที่ร่วมประกวด!')
      setSubmitted(true)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <SiteFooter />
      </div>
    )
  }

  // Not logged in (shouldn't reach here due to redirect, but safety fallback)
  if (!sessionUser) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <LogIn className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">กรุณาเข้าสู่ระบบก่อน</h2>
          <p className="mb-6 text-muted-foreground">ต้องยืนยันตัวตนเพื่อส่งผลงานรอบที่ 2</p>
          <Link to="/student/login">
            <Button className="gap-2"><LogIn className="h-4 w-4" /> เข้าสู่ระบบ</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // No team found
  if (!team) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <XCircle className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">ไม่พบข้อมูลทีม</h2>
          <p className="mb-2 text-muted-foreground">อีเมล <strong>{sessionUser.email}</strong> ไม่ได้สังกัดทีมใดในระบบ</p>
          <p className="mb-6 text-sm text-muted-foreground">หากสมัครทีมแล้ว กรุณาติดต่อเจ้าหน้าที่</p>
          <Link to="/contest/register">
            <Button variant="outline">สมัครทีมประกวด</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Team not approved
  if (team.round1_status !== 'approved') {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          {team.round1_status === 'rejected' ? (
            <XCircle className="mb-4 h-12 w-12 text-red-400" />
          ) : (
            <Clock className="mb-4 h-12 w-12 text-yellow-400" />
          )}
          <h2 className="mb-2 text-xl font-bold">
            {team.round1_status === 'rejected' ? 'ทีมไม่ผ่านการคัดเลือกรอบที่ 1' : 'รอผลการคัดเลือกรอบที่ 1'}
          </h2>
          <p className="mb-1 text-muted-foreground">ทีม: <strong>{team.team_name}</strong></p>
          <p className="text-sm text-muted-foreground">
            {team.round1_status === 'rejected'
              ? 'ขออภัย ทีมของท่านไม่ผ่านการพิจารณารอบที่ 1'
              : 'กรรมการกำลังตรวจสอบ Story Board จะแจ้งผลทาง email'}
          </p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Submitted successfully
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <Upload className="mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-xl font-bold">ส่งผลงานรอบที่ 2 เรียบร้อย!</h2>
          <p className="mb-6 text-muted-foreground">ขอบคุณที่ร่วมประกวด ทีม <strong>{team.team_name}</strong></p>
          <Link to="/student/dashboard">
            <Button variant="outline">กลับหน้า Dashboard</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/student/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับ Dashboard
          </Link>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-teal/15 p-2 text-teal"><Upload className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">ส่งผลงานรอบที่ 2</h1>
                <p className="text-sm text-muted-foreground">สำหรับทีมที่ผ่านการคัดเลือกรอบที่ 1 เท่านั้น</p>
              </div>
            </div>

            {/* Team info (read-only) */}
            <div className="mb-5 rounded-lg border bg-green-50/50 p-4 dark:bg-green-950/20">
              <p className="text-xs text-muted-foreground">ทีมของท่าน (ตรวจสอบจากอีเมล {sessionUser.email})</p>
              <p className="font-semibold text-green-700 dark:text-green-400">{team.team_name}</p>
              <p className="text-sm text-muted-foreground">{team.campaign_name}</p>
              <p className="mt-1 text-xs text-green-600">✅ ผ่านการคัดเลือกรอบที่ 1 — พร้อมส่งผลงานรอบที่ 2</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>ชื่อแคมเปญ *</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={200} />
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
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
