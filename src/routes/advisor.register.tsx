import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { registerAdvisor, getInstitutes, checkInstituteHasMainAdvisor, getInstituteJoinParticipation } from "@/lib/advisors.functions";
import { recordInstituteDecline, recordInstituteJoinConsent } from "@/lib/institute-participation.functions";

export const Route = createFileRoute("/advisor/register")({
  component: AdvisorRegisterPage,
});

type Step = "institute" | "declined" | "consent" | "advisor";

const CONSENT_TEXT =
  "ข้าพเจ้าในฐานะอาจารย์ที่ปรึกษาโครงการ ยินยอมให้โครงการเก็บรวบรวม ใช้ และเผยแพร่ข้อมูลที่เกี่ยวข้องกับการเข้าร่วมกิจกรรมและการดำเนินโครงการ เช่น ชื่อ-นามสกุล ตำแหน่ง หน่วยงาน/สถานศึกษา ภาพถ่าย ภาพเคลื่อนไหว วิดีโอ เสียง ผลงาน หรือข้อมูลอื่นที่เกี่ยวข้อง เพื่อใช้ในการประชาสัมพันธ์ การจัดทำรายงานผล การเผยแพร่ผ่านสื่อสิ่งพิมพ์ สื่ออิเล็กทรอนิกส์ เว็บไซต์ สื่อสังคมออนไลน์ และการดำเนินกิจกรรมอื่นที่เกี่ยวข้องกับโครงการ ทั้งนี้ การดำเนินการดังกล่าวจะเป็นไปตามกฎหมายคุ้มครองข้อมูลส่วนบุคคลและไม่ก่อให้เกิดความเสียหายแก่ผู้ให้ความยินยอม";

function AdvisorRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("institute");
  const [instituteId, setInstituteId] = useState("");
  const [participation, setParticipation] = useState<"join" | "decline" | "">("");
  const [consent, setConsent] = useState(false);
  const [advisorConsent, setAdvisorConsent] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    position: "",
    faculty: "",
    email: "",
    phone: "",
    address: "",
    postal_code: "",
    role: "main" as "main" | "assistant",
  });
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [savingParticipation, setSavingParticipation] = useState(false);
  const registerAdvisorFn = useServerFn(registerAdvisor);
  const recordInstituteDeclineFn = useServerFn(recordInstituteDecline);
  const recordInstituteJoinConsentFn = useServerFn(recordInstituteJoinConsent);
  const getInstitutesFn = useServerFn(getInstitutes);
  const checkMainAdvisorFn = useServerFn(checkInstituteHasMainAdvisor);
  const getJoinParticipationFn = useServerFn(getInstituteJoinParticipation);

  const { data: institutes, isLoading: institutesLoading } = useQuery({
    queryKey: ["institutes"],
    queryFn: () => getInstitutesFn(),
  });

  const selectedInstitute = institutes?.find((i) => i.id === instituteId);

  const { data: existingMain } = useQuery({
    queryKey: ["advisor-main-exists", instituteId],
    enabled: !!instituteId && (step === "advisor" || step === "institute"),
    queryFn: () => checkMainAdvisorFn({ data: { institute_id: instituteId } }),
  });

  const { data: existingJoinParticipation } = useQuery({
    queryKey: ["institute-join-participation", instituteId],
    enabled: !!instituteId && step === "institute",
    queryFn: () => getJoinParticipationFn({ data: { institute_id: instituteId } }),
  });

  const instituteAlreadyJoined = !!existingJoinParticipation;
  const canSkipToAdvisor = instituteAlreadyJoined && !!existingMain;

  // หมายเหตุ: ถ้ามีอาจารย์หลักอยู่แล้ว ผู้ลงทะเบียนใหม่จะถูกบังคับเป็นผู้ช่วย

  const submit = useMutation({
    mutationFn: async () => {
      const required = ["full_name", "position", "faculty", "email"] as const;
      for (const f of required) {
        if (!String(form[f]).trim()) throw new Error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(form.email.trim())) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
      if (!advisorConsent) throw new Error("กรุณากดยินยอมการเก็บและเผยแพร่ข้อมูลก่อนลงทะเบียน");

      await registerAdvisorFn({
        data: {
          full_name: form.full_name.trim(),
          position: form.position.trim(),
          faculty: form.faculty.trim(),
          institute_id: instituteId,
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          postal_code: form.postal_code.trim() || null,
          role: existingMain ? "assistant" : form.role,
          institute_participation_id: participationId,
          redirect_to: typeof window !== "undefined" ? `${window.location.origin}/set-password` : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("ลงทะเบียนสำเร็จ ระบบได้ส่งอีเมลเชิญตั้งรหัสผ่านให้แล้ว");
      setTimeout(() => navigate({ to: "/" }), 1200);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleInstituteContinue = async () => {
    if (!instituteId) return toast.error("กรุณาเลือกสถาบัน");

    // ถ้าสถาบันนี้ลงทะเบียน "ยินดีเข้าร่วม" + มีอาจารย์หลักแล้ว → ข้ามขั้น participation/consent
    if (canSkipToAdvisor && existingJoinParticipation) {
      setParticipation("join");
      setParticipationId(existingJoinParticipation.id);
      setStep("advisor");
      return;
    }

    if (!participation) return toast.error("กรุณาเลือกสถานะการเข้าร่วมโครงการ");

    if (participation === "decline") {
      setSavingParticipation(true);
      try {
        const res = await recordInstituteDeclineFn({
          data: { institute_id: instituteId },
        });
        setParticipationId(res.id);
        setStep("declined");
      } catch (e: any) {
        toast.error(e.message ?? "บันทึกสถานะไม่สำเร็จ");
      } finally {
        setSavingParticipation(false);
      }
      return;
    }

    // participation === "join":
    // ถ้าสถาบันเคย consent มาแล้ว ใช้ participation เดิม ไม่ต้อง consent ซ้ำ
    if (existingJoinParticipation) {
      setParticipationId(existingJoinParticipation.id);
      setStep("advisor");
      return;
    }
    // ยังไม่บันทึก รอให้ยินยอม consent ก่อน
    setStep("consent");
  };

  const handleConsentContinue = async () => {
    if (!consent) return toast.error("กรุณากดยินยอมก่อนดำเนินการต่อ");
    setSavingParticipation(true);
    try {
      const res = await recordInstituteJoinConsentFn({
        data: { institute_id: instituteId, consent_text: CONSENT_TEXT },
      });
      setParticipationId(res.id);
      setStep("advisor");
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกการยินยอมไม่สำเร็จ");
    } finally {
      setSavingParticipation(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />กลับหน้าแรก
        </Link>

        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">ลงทะเบียนสถาบัน</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            เลือกสถาบันของท่านและยืนยันการเข้าร่วมโครงการ
          </p>

          {step === "institute" && (
            <Card className="mt-6 p-6 space-y-6">
              <div>
                <Label htmlFor="institute">สถาบัน *</Label>
                <Select
                  value={instituteId}
                  onValueChange={setInstituteId}
                  disabled={institutesLoading}
                >
                  <SelectTrigger id="institute">
                    <SelectValue placeholder={institutesLoading ? "กำลังโหลดสถาบัน..." : "เลือกสถาบันในเครือข่าย"} />
                  </SelectTrigger>
                  <SelectContent>
                    {institutes?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.institute}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canSkipToAdvisor ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-foreground/80 flex gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>
                    สถาบันนี้ได้ลงทะเบียนเข้าร่วมโครงการและมีอาจารย์หลักแล้ว — ท่านสามารถดำเนินการลงทะเบียนเป็นอาจารย์ผู้ช่วยได้ทันที
                  </span>
                </div>
              ) : (
                <div>
                  <Label className="mb-3 block">สถานะการเข้าร่วมโครงการ *</Label>
                  <RadioGroup value={participation} onValueChange={(v) => setParticipation(v as any)} className="space-y-2">
                    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                      <RadioGroupItem value="join" id="join" className="mt-0.5" />
                      <div>
                        <div className="font-medium">ยินดีเข้าร่วมโครงการ</div>
                        <div className="text-xs text-muted-foreground">
                          {instituteAlreadyJoined
                            ? "สถาบันนี้ได้ลงทะเบียนเข้าร่วมแล้ว — สามารถลงทะเบียนอาจารย์ที่ปรึกษาต่อได้"
                            : "สถาบันยินดีเข้าร่วมและส่งอาจารย์ที่ปรึกษา"}
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                      <RadioGroupItem value="decline" id="decline" className="mt-0.5" />
                      <div>
                        <div className="font-medium">ไม่สามารถเข้าร่วมโครงการได้</div>
                        <div className="text-xs text-muted-foreground">สถาบันไม่สามารถเข้าร่วมในรอบนี้</div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              )}

              <Button onClick={handleInstituteContinue} disabled={savingParticipation} className="w-full bg-gradient-primary">
                {savingParticipation ? "กำลังบันทึก..." : "ถัดไป"}
              </Button>
            </Card>
          )}

          {step === "declined" && (
            <Card className="mt-6 p-8 text-center space-y-4">
              <XCircle className="mx-auto h-14 w-14 text-muted-foreground" />
              <h2 className="text-xl font-semibold">ขอบคุณสำหรับการตอบรับ</h2>
              <p className="text-sm text-muted-foreground">
                ระบบได้รับทราบว่า{selectedInstitute?.institute ? <strong>{selectedInstitute.institute}</strong> : "สถาบันของท่าน"}
                ไม่สามารถเข้าร่วมโครงการในครั้งนี้ ขอบคุณที่สละเวลาตอบกลับ
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("institute")}>ย้อนกลับ</Button>
                <Button onClick={() => navigate({ to: "/" })}>กลับหน้าแรก</Button>
              </div>
            </Card>
          )}

          {step === "consent" && (
            <Card className="mt-6 p-6 space-y-5">
              <h2 className="text-lg font-semibold">หนังสือให้ความยินยอม (Consent)</h2>
              <div className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
                {CONSENT_TEXT}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} className="mt-0.5" />
                <span className="text-sm">
                  ข้าพเจ้ายินยอมตามข้อความข้างต้น และพร้อมระบุข้อมูลอาจารย์ที่ปรึกษาเพื่อดำเนินการต่อ
                </span>
              </label>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("institute")}>ย้อนกลับ</Button>
                <Button onClick={handleConsentContinue} disabled={!consent || savingParticipation} className="bg-gradient-primary">{savingParticipation ? "กำลังบันทึก..." : "ตกลง"}</Button>
              </div>
            </Card>
          )}

          {step === "advisor" && (
            <Card className="mt-6 p-6">
              <div className="mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                สถาบัน: <strong>{selectedInstitute?.institute}</strong> — โปรดระบุข้อมูลอาจารย์ที่ปรึกษา
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
              >
                <div>
                  <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                  <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="position">ตำแหน่ง *</Label>
                    <Input id="position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="faculty">คณะ *</Label>
                    <Input id="faculty" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">อีเมล *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">หมายเลขโทรศัพท์</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Textarea id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} />
                </div>
                <div className="max-w-xs">
                  <Label htmlFor="postal_code">รหัสไปรษณีย์</Label>
                  <Input id="postal_code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
                </div>

                <div>
                  <Label className="mb-2 block">บทบาทอาจารย์ *</Label>
                  {existingMain ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                      สถาบันนี้มี <strong>อาจารย์หลัก</strong> แล้ว — ท่านจะลงทะเบียนเป็น <strong>อาจารย์ผู้ช่วย</strong>
                    </div>
                  ) : (
                    <RadioGroup
                      value={form.role}
                      onValueChange={(v) => setForm({ ...form, role: v as "main" | "assistant" })}
                      className="space-y-2"
                    >
                      <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                        <RadioGroupItem value="main" id="role-main" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">อาจารย์หลัก (1 ท่านต่อสถาบัน)</div>
                          <div className="text-xs text-muted-foreground">ผู้ประสานหลักของสถาบัน</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30">
                        <RadioGroupItem value="assistant" id="role-assistant" className="mt-0.5" />
                        <div>
                          <div className="font-medium text-sm">อาจารย์ผู้ช่วย (มีได้มากกว่า 1 ท่าน)</div>
                          <div className="text-xs text-muted-foreground">ช่วยอนุมัติผู้สมัครเรียนหลักสูตร</div>
                        </div>
                      </label>
                    </RadioGroup>
                  )}
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>หลังลงทะเบียน ระบบจะสร้างบัญชีผู้ใช้และส่งอีเมลเชิญตั้งรหัสผ่าน อาจารย์ทุกท่านของสถาบันจะได้รับอีเมลแจ้งเมื่อมีนักศึกษาลงทะเบียน เพื่อช่วยกันอนุมัติ</span>
                </div>

                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  <div className="text-sm font-semibold">หนังสือให้ความยินยอม (Consent)</div>
                  <div className="text-xs leading-relaxed text-foreground/80">{CONSENT_TEXT}</div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={advisorConsent} onCheckedChange={(v) => setAdvisorConsent(Boolean(v))} className="mt-0.5" />
                    <span className="text-sm">ข้าพเจ้ายินยอมตามข้อความข้างต้น</span>
                  </label>
                </div>




                <div className="flex justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep("consent")}>ย้อนกลับ</Button>
                  <Button type="submit" className="flex-1 bg-gradient-primary" disabled={submit.isPending || !advisorConsent}>
                    {submit.isPending ? "กำลังลงทะเบียน..." : "ลงทะเบียนอาจารย์ที่ปรึกษา"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
