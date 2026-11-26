import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Upload, Loader2, FileVideo, FileText, LogIn, XCircle, MessageSquare, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSession } from "@/lib/auth.server";
import { getMyContestTeam, createContestUploadUrl, submitRevisedContestEntry } from "@/lib/contest.functions";

export const Route = createFileRoute("/contest/submit-revised")({
  component: ContestSubmitRevisedPage,
});

function ContestSubmitRevisedPage() {
  const navigate = useNavigate()
  const getSessionFn = useServerFn(getSession)
  const getMyTeamFn = useServerFn(getMyContestTeam)
  const createUpload = useServerFn(createContestUploadUrl)
  const submitRevised = useServerFn(submitRevisedContestEntry)

  const [sessionUser, setSessionUser] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [note, setNote] = useState("")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [storyboardFile, setStoryboardFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    getSessionFn()
      .then(async (session) => {
        if (!session || session.role !== 'student') {
          navigate({ to: '/student/login' })
          return
        }
        setSessionUser(session)
        const myTeam = await getMyTeamFn({ data: { email: session.email } })
        setTeam(myTeam)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  const submit = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error('ไม่พบข้อมูลทีม')
      if (team.round1_status !== 'approved') throw new Error('ทีมยังไม่ผ่านการคัดเลือกรอบที่ 1')
      if (team.role !== 'leader') throw new Error('เฉพาะหัวหน้าทีมเท่านั้นที่สามารถส่งผลงานแก้ไขได้')
      if (!team.has_original_submission) throw new Error('ต้องส่งผลงานรอบ 2 (ต้นฉบับ) ก่อน')
      if (!team.has_judge_comments) throw new Error('ยังไม่มี comment จากกรรมการ ไม่สามารถส่งผลงานแก้ไขได้')
      if (!videoFile) throw new Error('กรุณาแนบไฟล์ VDO Clip ที่แก้ไขแล้ว (.mp4)')
      if (!/\.mp4$/i.test(videoFile.name)) throw new Error('ไฟล์ VDO ต้องเป็นนามสกุล .mp4 เท่านั้น')
      if (videoFile.size > 500 * 1024 * 1024) throw new Error('ไฟล์ VDO ต้องไม่เกิน 500MB')
      if (storyboardFile) {
        if (!/\.pdf$/i.test(storyboardFile.name) && storyboardFile.type !== 'application/pdf')
          throw new Error('Story Board ต้องเป็นไฟล์ PDF เท่านั้น')
        if (storyboardFile.size > 100 * 1024 * 1024) throw new Error('ไฟล์ Story Board ต้องไม่เกิน 100MB')
      }

      let videoOrigName: string
      try { videoOrigName = decodeURIComponent(videoFile.name) } catch { videoOrigName = videoFile.name }

      const safeVideo = `revised_${videoOrigName.replace(/[^\w.\- ]/g, '_')}`
      const { path: videoPath, signedUrl: videoUrl } = await createUpload({ data: { teamId: team.id, filename: safeVideo } })
      const upVideo = await fetch(videoUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: videoFile })
      if (!upVideo.ok) throw new Error('อัปโหลดไฟล์ VDO ไม่สำเร็จ')

      let sbPath: string | null = null
      let sbFileName: string | null = null
      let sbFileSize: number | null = null

      if (storyboardFile) {
        let sbOrigName: string
        try { sbOrigName = decodeURIComponent(storyboardFile.name) } catch { sbOrigName = storyboardFile.name }
        const safeSb = `revised_storyboard_${sbOrigName.replace(/[^\w.\- ]/g, '_')}`
        const { path: p, signedUrl: sbUrl } = await createUpload({ data: { teamId: team.id, filename: safeSb } })
        const upSb = await fetch(sbUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: storyboardFile })
        if (!upSb.ok) throw new Error('อัปโหลดไฟล์ Story Board ไม่สำเร็จ')
        sbPath = p
        sbFileName = sbOrigName
        sbFileSize = storyboardFile.size
      }

      await submitRevised({
        data: {
          teamId: team.id,
          path: videoPath,
          fileName: videoOrigName,
          fileSize: videoFile.size,
          storyboardPath: sbPath,
          storyboardFileName: sbFileName,
          storyboardFileSize: sbFileSize,
          note: note.trim() || null,
          submitterEmail: sessionUser?.email ?? null,
        },
      })
    },
    onSuccess: () => {
      toast.success('ส่งผลงานรอบ 2 (แก้ไข) เรียบร้อย!')
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

  if (!sessionUser) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <LogIn className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">กรุณาเข้าสู่ระบบก่อน</h2>
          <Link to="/student/login"><Button className="gap-2"><LogIn className="h-4 w-4" /> เข้าสู่ระบบ</Button></Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!team || team.role !== 'leader') {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <XCircle className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">เฉพาะหัวหน้าทีมเท่านั้น</h2>
          <p className="mb-6 text-muted-foreground">การส่งผลงานแก้ไขทำได้เฉพาะหัวหน้าทีมเท่านั้น</p>
          <Link to="/student/dashboard"><Button variant="outline">กลับ Dashboard</Button></Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if ((team.judge_count ?? 0) < 12) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">กรรมการยังให้คะแนนไม่ครบ</h2>
          <p className="mb-2 text-muted-foreground">ให้คะแนนแล้ว <strong>{team.judge_count ?? 0}/12 ท่าน</strong></p>
          <p className="mb-6 text-sm text-muted-foreground">ระบบจะเปิดให้ส่งผลงานแก้ไขเมื่อกรรมการให้คะแนนครบ 12 ท่านแล้ว</p>
          <Link to="/student/dashboard"><Button variant="outline">กลับ Dashboard</Button></Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!team.has_judge_comments) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">ยังไม่มี Comment จากกรรมการ</h2>
          <p className="mb-6 text-muted-foreground">ระบบจะเปิดให้ส่งผลงานแก้ไขเมื่อกรรมการมี comment สำหรับทีมของท่าน</p>
          <Link to="/student/dashboard"><Button variant="outline">กลับ Dashboard</Button></Link>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <Upload className="mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-xl font-bold">ส่งผลงานรอบ 2 (แก้ไข) เรียบร้อย!</h2>
          <p className="mb-6 text-muted-foreground">ทีม <strong>{team.team_name}</strong> ส่งผลงานที่แก้ไขแล้วเรียบร้อย</p>
          <Link to="/student/dashboard"><Button variant="outline">กลับ Dashboard</Button></Link>
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
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600"><Upload className="h-6 w-6" /></div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold">ส่งผลงานรอบ 2 (แก้ไข)</h1>
                <p className="text-sm text-muted-foreground">อัปโหลดผลงานที่แก้ไขตาม comment ของกรรมการ — ไฟล์ต้นฉบับจะยังคงอยู่</p>
              </div>
            </div>

            {/* Team info */}
            <div className="mb-5 rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
              <p className="text-xs text-muted-foreground">ทีม (หัวหน้าทีม: {sessionUser.email})</p>
              <p className="font-semibold text-blue-700 dark:text-blue-400">{team.team_name}</p>
              <p className="text-sm text-muted-foreground">{team.campaign_name}</p>
              <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> มี comment จากกรรมการ — กรุณาแก้ไขและ upload ใหม่
              </p>
            </div>

            {/* Warning */}
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-400">กรุณาตรวจสอบ version ไฟล์ที่ถูกต้องก่อนทำการ Upload File</p>
                <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-500">เมื่อส่งผลงานแก้ไขแล้ว <strong>ไม่สามารถ Upload ใหม่ได้</strong> กรุณาตรวจสอบไฟล์ให้ครบถ้วนก่อนกดส่ง</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>VDO Clip ที่แก้ไขแล้ว * (ไฟล์ .mp4 เท่านั้น ไม่เกิน 500MB)</Label>
                <div className="rounded-md border border-dashed p-4">
                  <input
                    type="file"
                    accept=".mp4,video/mp4"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
                  />
                  {videoFile && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <FileVideo className="h-4 w-4" /> {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Story Board ที่แก้ไขแล้ว (ไฟล์ .pdf ไม่เกิน 100MB — ไม่บังคับ)</Label>
                <div className="rounded-md border border-dashed p-4">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setStoryboardFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
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
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
                  placeholder="อธิบายสิ่งที่แก้ไขตาม comment ของกรรมการ..." />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={submit.isPending}
                    className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700"
                    size="lg"
                  >
                    {submit.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> กำลังอัปโหลด...</>
                      : <><Upload className="h-4 w-4" /> ส่งผลงานแก้ไข</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ยืนยันการส่งผลงานรอบ 2 (แก้ไข)</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm">
                        <p>กรุณาตรวจสอบให้แน่ใจว่าไฟล์ที่เลือกถูกต้องก่อนยืนยัน</p>
                        {videoFile && (
                          <div className="rounded-md bg-muted px-3 py-2 text-xs">
                            <span className="font-medium">VDO:</span> {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        )}
                        {storyboardFile && (
                          <div className="rounded-md bg-muted px-3 py-2 text-xs">
                            <span className="font-medium">Story Board:</span> {storyboardFile.name} ({(storyboardFile.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        )}
                        <p className="font-semibold text-destructive">⚠️ เมื่อส่งแล้วไม่สามารถ Upload ใหม่ได้</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก — ตรวจสอบไฟล์อีกครั้ง</AlertDialogCancel>
                    <AlertDialogAction onClick={() => submit.mutate()} className="bg-blue-600 text-white hover:bg-blue-700">
                      ยืนยัน ส่งผลงานแก้ไข
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
