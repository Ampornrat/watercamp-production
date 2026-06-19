import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Users, User, Clock, ArrowLeft, Lock, Sparkles, Info, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { createGuestRegistrations } from "@/lib/guest-registrations.functions";


export const Route = createFileRoute("/trainings/$id")({
  component: TrainingDetail,
});

function formatDate(s: string) {
  return new Date(s).toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
}

const PDPA_TEXT = `โปรดอ่านและพิจารณานโยบายคุ้มครองข้อมูลส่วนบุคคล:

       ตามที่สถาบันสารสนเทศทรัพยากรน้ำ (องค์การมหาชน) ต่อไปในเอกสารนี้จะเรียกว่า "สสน." ได้ดำเนินการสำหรับโครงการ ThaiWater Challenge ต่อไปในเอกสารนี้จะเรียกว่า "กิจกรรม" ซึ่งมีการประมวลผลข้อมูลส่วนบุคคลของผู้เข้าร่วมกิจกรรมดังกล่าวต่อไปในเอกสารนี้จะเรียกว่า "เจ้าของข้อมูลส่วนบุคคล"

       โดยที่เจ้าข้อมูลส่วนบุคคลจะได้รับการคุ้มครองข้อมูลส่วนบุคคลตามที่พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. ๒๕๖๒ กำหนด ซึ่งสามารถศึกษารายละเอียดของประกาศความเป็นส่วนตัวแบบเต็มรูปแบบ ผ่านทางลิ้งค์นี้ https://shorturl.asia/cxfa1

       ทั้งนี้ สามารถศึกษารายละเอียดประกาศความเป็นส่วนตัวเบื้องต้นได้ ตามข้อความต่อไปนี้

1. การประมวลผลข้อมูลส่วนบุคคล: สสน. จะดำเนินการประมวลผลข้อมูลตามที่ได้เก็บรวบรวมจากเจ้าของข้อมูลส่วนบุคคลในกิจกรรมนี้ ได้แก่ ข้อมูลอัตลักษณ์ ข้อมูลการทำงาน

2. การใช้ข้อมูลส่วนบุคคล: สสน. จะใช้ข้อมูลส่วนบุคคลเพื่อการดำเนินการต่าง ๆ
อันเกี่ยวข้องกับวัตถุประสงค์ของ สสน. ทั้งนี้ สสน. ได้ระบุเหตุผล ความจำเป็น และฐานทางกฎหมายสำหรับการประมวลผลข้อมูลไว้อย่างชัดเจนในประกาศความเป็นส่วนตัวฉบับนี้

3. การส่งข้อมูลส่วนบุคคล: สสน. อาจจำเป็นต้องส่งและ/หรือเปิดเผยข้อมูลส่วนบุคคลของเจ้าของข้อมูลส่วนบุคคลในกิจกรรมนี้ ไปยังหน่วยงานภายนอกตามเหตุผลความจำเป็นที่ได้อธิบายไว้ในประกาศความเป็นส่วนตัวฉบับนี้ และรายการหน่วยงานที่มีการส่งข้อมูล

4. สิทธิของเจ้าของข้อมูลส่วนบุคคล: เจ้าของข้อมูลส่วนบุคคลมีสิทธิในฐานะเจ้าของข้อมูลส่วนบุคคล
ซึ่งรวมถึงสิทธิในการเข้าถึง การแก้ไข และการลบข้อมูลส่วนบุคคล และสิทธิอื่น ๆ ตามที่ได้ระบุไว้ในประกาศความเป็นส่วนตัวฉบับนี้

5. การเปลี่ยนแปลงนโยบาย: สสน. จะดำเนินการแจ้งให้เจ้าของข้อมูลส่วนบุคคลในกิจกรรมนี้ทราบ
ในกรณีที่มีการทบทวนหรือปรับปรุงประกาศความเป็นส่วนตัวฉบับนี้

(ปรับปรุงล่าสุด: วันที่ 15 มิถุนายน 2569)`;

const EDUCATION_OPTIONS = [
  "ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)",
  "ปริญญาตรี",
  "ปริญญาโท",
  "ปริญญาเอก",
  "อื่นๆ",
] as const;

const PARTICIPANT_STATUS_OPTIONS = [
  "กองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.)",
  "นักศึกษาทั่วไป",
  "ครู/อาจารย์",
  "อื่นๆ",
] as const;

function TrainingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const createGuestRegistrationsFn = useServerFn(createGuestRegistrations);
  const [form, setForm] = useState({
    name: "",
    email: "",
    instituteId: "",
    gender: "",
    age: "",
    educationLevel: "",
    educationLevelOther: "",
    fieldOfStudy: "",
    participantStatus: "",
    participantStatusOther: "",
  });
  const [consent, setConsent] = useState(true);
  const [selectedElectives, setSelectedElectives] = useState<Set<string>>(new Set());

  const {
    data: institutes,
    isLoading: institutesLoading,
    isError: institutesError,
    error: institutesErrorObj,
    refetch: refetchInstitutes,
  } = useQuery({
    queryKey: ["institutes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutes_tab")
        .select("id, institute, region")
        .order("institute", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: training, isLoading } = useQuery({
    queryKey: ["training", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // ดึงชื่อหลักสูตรหลักที่ต้องผ่านก่อน (ถ้ามีการระบุ) สำหรับหน้า elective
  const { data: prereqTraining } = useQuery({
    queryKey: ["prereq", training?.prerequisite_training_id],
    enabled: !!training?.prerequisite_training_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("trainings")
        .select("id, title")
        .eq("id", training!.prerequisite_training_id!)
        .maybeSingle();
      return data;
    },
  });

  // สำหรับหน้า "หลักสูตรหลัก": ดึงหลักสูตรเสริมทักษะที่ผูกกับหลักสูตรนี้ หรือไม่ระบุ prereq เลย
  const { data: relatedElectives } = useQuery({
    queryKey: ["relatedElectives", id, training?.course_type],
    enabled: !!training && training.course_type === "core",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("id, title, description, start_date, end_date, location, category, prerequisite_training_id")
        .eq("course_type", "elective")
        .eq("is_published", true)
        .or(`prerequisite_training_id.eq.${id},prerequisite_training_id.is.null`)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // สำหรับหน้า "เสริมทักษะ": ดึงรายชื่อหลักสูตรหลักที่แนะนำ (โดยเฉพาะ prereq ถ้ามี)
  const { data: recommendedCores } = useQuery({
    queryKey: ["recommendedCores", id, training?.course_type, training?.prerequisite_training_id],
    enabled: !!training && training.course_type === "elective",
    queryFn: async () => {
      let q = supabase
        .from("trainings")
        .select("id, title, start_date")
        .eq("course_type", "core")
        .eq("is_published", true)
        .order("start_date", { ascending: true });
      if (training!.prerequisite_training_id) {
        q = q.eq("id", training!.prerequisite_training_id);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: regCount } = useQuery({
    queryKey: ["regCount", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("training_id", id);
      return count ?? 0;
    },
  });

  // ดึงจำนวนที่นั่งคงเหลือของแต่ละหลักสูตรเสริมทักษะที่แสดง
  const electiveIdsList = (relatedElectives ?? []).map((e) => e.id);
  const { data: electiveStats, refetch: refetchElectiveStats } = useQuery({
    queryKey: ["electiveStats", electiveIdsList.slice().sort().join(",")],
    enabled: electiveIdsList.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        electiveIdsList.map(async (eid) => {
          const [{ data: t }, { count }] = await Promise.all([
            supabase.from("trainings").select("capacity").eq("id", eid).maybeSingle(),
            supabase.from("registrations").select("*", { count: "exact", head: true }).eq("training_id", eid),
          ]);
          return [eid, { capacity: t?.capacity ?? 0, count: count ?? 0 }] as const;
        }),
      );
      return Object.fromEntries(results) as Record<string, { capacity: number; count: number }>;
    },
  });

  const register = useMutation({
    mutationFn: async () => {
      if (!consent) throw new Error("กรุณายินยอมการเก็บข้อมูลส่วนบุคคล (PDPA) ก่อนลงทะเบียน");
      if (!form.instituteId) throw new Error("กรุณาเลือกสถาบัน");
      if (!form.name.trim() || !form.email.trim()) {
        throw new Error("กรุณากรอกชื่อ-นามสกุล และอีเมล");
      }
      if (!form.gender) throw new Error("กรุณาเลือกเพศ");
      const ageNum = parseInt(form.age, 10);
      if (!form.age.trim() || Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        throw new Error("กรุณากรอกอายุให้ถูกต้อง");
      }
      if (!form.educationLevel) throw new Error("กรุณาเลือกระดับการศึกษา");
      if (form.educationLevel === "อื่นๆ" && !form.educationLevelOther.trim()) {
        throw new Error("กรุณาระบุระดับการศึกษา");
      }
      if (!form.participantStatus) throw new Error("กรุณาเลือกสถานะการเข้าร่วม");
      if (form.participantStatus === "อื่นๆ" && !form.participantStatusOther.trim()) {
        throw new Error("กรุณาระบุสถานะการเข้าร่วม");
      }

      const electiveIds = Array.from(selectedElectives);

      // ตรวจสอบจำนวนที่นั่งหลักสูตรหลัก + หลักสูตรเสริมทักษะที่เลือก แบบสด ๆ ก่อนยืนยัน
      const idsToCheck = [id, ...electiveIds];
      const fresh = await Promise.all(
        idsToCheck.map(async (tid) => {
          const [{ data: t }, { count }] = await Promise.all([
            supabase.from("trainings").select("title, capacity").eq("id", tid).maybeSingle(),
            supabase.from("registrations").select("*", { count: "exact", head: true }).eq("training_id", tid),
          ]);
          return { id: tid, title: t?.title ?? "", capacity: t?.capacity ?? 0, count: count ?? 0 };
        }),
      );
      const full = fresh.filter((r) => r.count >= r.capacity);
      if (full.length > 0) {
        qc.invalidateQueries({ queryKey: ["regCount", id] });
        refetchElectiveStats();
        const names = full.map((f) => `"${f.title}" (${f.count}/${f.capacity})`).join(", ");
        throw new Error(`ที่นั่งเต็มแล้วสำหรับ: ${names} กรุณายกเลิกการเลือกหลักสูตรดังกล่าวก่อนยืนยัน`);
      }

      const baseRow = {
        user_id: user?.id ?? null,
        institute_id: form.instituteId,
        guest_name: form.name.trim(),
        guest_email: form.email.trim(),
        gender: form.gender,
        age: ageNum,
        education_level: form.educationLevel,
        education_level_other: form.educationLevel === "อื่นๆ" ? form.educationLevelOther.trim() : null,
        field_of_study: form.fieldOfStudy.trim() || null,
        participant_status: form.participantStatus,
        participant_status_other: form.participantStatus === "อื่นๆ" ? form.participantStatusOther.trim() : null,
        pdpa_consent: true,
        pdpa_consent_at: new Date().toISOString(),
        pdpa_consent_text: PDPA_TEXT,
      };



      // ตรวจสอบว่าผู้ใช้ลงทะเบียนหลักสูตรเหล่านี้ไปแล้วหรือยัง (กันซ้ำ)
      if (user?.id) {
        const { data: existing } = await supabase
          .from("registrations")
          .select("training_id, trainings(title)")
          .eq("user_id", user.id)
          .in("training_id", idsToCheck);
        if (existing && existing.length > 0) {
          const names = existing.map((r: any) => `"${r.trainings?.title ?? r.training_id}"`).join(", ");
          throw new Error(`คุณได้ลงทะเบียนหลักสูตรนี้ไปแล้ว: ${names} กรุณายกเลิกการเลือกก่อนยืนยัน`);
        }
      }

      // 1) ลงหลักสูตรหลักก่อน (เพื่อให้ trigger ของ elective ผ่าน)
      if (user?.id) {
        const { error: mainErr } = await supabase
          .from("registrations")
          .insert({ ...baseRow, training_id: id });
        if (mainErr) {
          if ((mainErr as any).code === "23505") throw new Error("คุณได้ลงทะเบียนหลักสูตรนี้ไปแล้ว");
          throw mainErr;
        }

        // 2) ลงหลักสูตรเสริมทักษะที่เลือกไว้ (ถ้ามี)
        if (electiveIds.length > 0) {
          const rows = electiveIds.map((eid) => ({ ...baseRow, training_id: eid }));
          const { error: elecErr } = await supabase.from("registrations").insert(rows);
          if (elecErr) {
            const msg = (elecErr as any).code === "23505"
              ? "คุณได้ลงทะเบียนหลักสูตรเสริมทักษะบางหลักสูตรไปแล้ว"
              : elecErr.message;
            throw new Error(`ลงทะเบียนหลักสูตรหลักสำเร็จ แต่ลงหลักสูตรเสริมทักษะไม่สำเร็จ: ${msg}`);
          }
        }
      } else {
        // Guest path: route through validated server function (supabaseAdmin) instead of an open RLS policy
        await createGuestRegistrationsFn({
          data: {
            training_ids: [id, ...electiveIds],
            institute_id: form.instituteId,
            guest_name: form.name.trim(),
            guest_email: form.email.trim(),
            gender: form.gender,
            age: ageNum,
            education_level: form.educationLevel,
            education_level_other: form.educationLevel === "อื่นๆ" ? form.educationLevelOther.trim() : null,
            field_of_study: form.fieldOfStudy.trim() || null,
            participant_status: form.participantStatus,
            participant_status_other: form.participantStatus === "อื่นๆ" ? form.participantStatusOther.trim() : null,
            pdpa_consent_text: PDPA_TEXT,
          },
        });
      }


      // 3) ส่งอีเมลยืนยันการลงทะเบียน แยกเมล์ละหลักสูตร (ไม่ block หากส่งไม่สำเร็จ)
      const trainingIds = [id, ...electiveIds];
      await Promise.all(
        trainingIds.map(async (tid) => {
          try {
            await fetch("/api/public/trainings/notify-registration", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trainingId: tid,
                email: form.email.trim(),
              }),
            });
          } catch (err) {
            console.error("Failed to send confirmation email for training", tid, err);
          }
        }),
      );



      return { mainOk: true, electives: electiveIds.length };
    },
    onSuccess: (r) => {
      toast.success(
        r.electives > 0
          ? `ลงทะเบียนสำเร็จ! รวมหลักสูตรเสริมทักษะ ${r.electives} หลักสูตร — ส่งอีเมลยืนยันแล้ว`
          : "ลงทะเบียนสำเร็จ! ส่งอีเมลยืนยันแล้ว รอการยืนยันจากผู้ดูแล",
      );
      setForm({ name: "", email: "", instituteId: "", gender: "", age: "", educationLevel: "", educationLevelOther: "", fieldOfStudy: "", participantStatus: "", participantStatusOther: "" });
      setConsent(false);
      setSelectedElectives(new Set());
      qc.invalidateQueries({ queryKey: ["regCount", id] });
      refetchElectiveStats();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>;
  if (!training) return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-16 text-center">
        <p className="text-muted-foreground">ไม่พบหลักสูตร</p>
        <Link to="/trainings"><Button variant="link">กลับ</Button></Link>
      </div>
      <SiteFooter />
    </div>
  );

  const isFull = (regCount ?? 0) >= training.capacity;
  const isElective = training.course_type === "elective";
  const isCore = training.course_type === "core";
  const prereqLabel = prereqTraining?.title || "หลักสูตรหลักใดก็ได้";

  const toggleElective = (eid: string) => {
    setSelectedElectives((prev) => {
      const next = new Set(prev);
      if (next.has(eid)) next.delete(eid); else next.add(eid);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        <Link to="/trainings" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />กลับไปรายการหลักสูตร
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: course info + details below */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden">
              {training.cover_image_url ? (
                <img src={training.cover_image_url} alt={training.title} className="h-48 w-full object-cover md:h-72" />
              ) : (
                <div className="h-48 bg-gradient-primary md:h-64" />
              )}
              <div className="p-6 md:p-8">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {isCore
                    ? <Badge>หลักสูตรหลัก</Badge>
                    : <Badge variant="outline">หลักสูตรเสริมทักษะ</Badge>}
                  {training.category && <Badge variant="secondary">{training.category}</Badge>}
                </div>
                <h1 className="text-2xl font-bold text-foreground md:text-3xl">{training.title}</h1>
                {isElective && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <Lock className="mr-1 inline h-3.5 w-3.5" />
                    ต้องลงทะเบียน: <span className="font-medium text-foreground">{prereqLabel}</span> ก่อนจึงจะลงทะเบียนหลักสูตรนี้ได้
                  </p>
                )}
                <p className="mt-4 whitespace-pre-line text-muted-foreground">{training.description}</p>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">รายละเอียด</h2>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-3"><Calendar className="mt-0.5 h-4 w-4 text-primary" /><div><div className="font-medium">เริ่ม</div><div className="text-muted-foreground">{formatDate(training.start_date)}</div></div></div>
                <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 text-primary" /><div><div className="font-medium">สิ้นสุด</div><div className="text-muted-foreground">{formatDate(training.end_date)}</div></div></div>
                {training.location && <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" /><div><div className="font-medium">สถานที่</div><div className="text-muted-foreground">{training.location}</div></div></div>}
                {training.instructor && <div className="flex items-start gap-3"><User className="mt-0.5 h-4 w-4 text-primary" /><div><div className="font-medium">วิทยากร</div><div className="text-muted-foreground">{training.instructor}</div></div></div>}
                <div className="flex items-start gap-3"><Users className="mt-0.5 h-4 w-4 text-primary" /><div><div className="font-medium">ผู้ลงทะเบียน</div><div className="text-muted-foreground">{regCount ?? 0} / {training.capacity} คน</div></div></div>
              </div>
            </Card>

            {(() => {
              const attachments = [
                { url: training.attachment_1_url, name: training.attachment_1_name },
                { url: training.attachment_2_url, name: training.attachment_2_name },
                { url: training.attachment_3_url, name: training.attachment_3_name },
              ].filter((a) => a.url);
              if (attachments.length === 0) return null;
              return (
                <Card className="p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Paperclip className="h-5 w-5 text-primary" />
                    เอกสารแนบ
                  </h2>
                  <ul className="mt-4 space-y-2">
                    {attachments.map((a, idx) => {
                      const fileName = a.name || a.url!.split("/").pop() || `เอกสารแนบ ${idx + 1}`;
                      return (
                        <li key={idx}>
                          <a
                            href={a.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-accent"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              {fileName}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-primary">
                              <Download className="h-4 w-4" />
                              ดาวน์โหลด
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })()}



            {/* หลักสูตรเสริมทักษะที่ลงพร้อมกันได้ (เฉพาะเมื่อดูหลักสูตรหลัก) */}
            {isCore && (
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">หลักสูตรเสริมทักษะ (เรียนต่อเนื่อง)</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  เลือกลงทะเบียนหลักสูตรเสริมทักษะพร้อมกันในคราวเดียวได้ (หรือไม่เลือกก็ได้ — ไม่บังคับ)
                </p>

                {!relatedElectives || relatedElectives.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                    ยังไม่มีหลักสูตรเสริมทักษะที่เปิดให้ลงทะเบียนต่อเนื่องในขณะนี้
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {relatedElectives.map((e) => {
                      const checked = selectedElectives.has(e.id);
                      const stat = electiveStats?.[e.id];
                      const seatsLeft = stat ? Math.max(stat.capacity - stat.count, 0) : undefined;
                      const elecFull = stat ? stat.count >= stat.capacity : false;
                      return (
                        <label
                          key={e.id}
                          htmlFor={`elec-${e.id}`}
                          className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                            elecFull
                              ? "cursor-not-allowed border-muted bg-muted/30 opacity-70"
                              : checked
                                ? "cursor-pointer border-primary bg-primary/5"
                                : "cursor-pointer hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            id={`elec-${e.id}`}
                            checked={checked}
                            onCheckedChange={() => toggleElective(e.id)}
                            disabled={elecFull}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium text-foreground">{e.title}</div>
                              {e.category && <Badge variant="secondary" className="text-xs">{e.category}</Badge>}
                              {elecFull ? (
                                <Badge variant="destructive" className="text-xs">เต็มแล้ว</Badge>
                              ) : stat ? (
                                <Badge variant="outline" className="text-xs">เหลือ {seatsLeft} ที่นั่ง</Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span><Calendar className="mr-1 inline h-3 w-3" />{formatDate(e.start_date)}</span>
                              {e.location && <span><MapPin className="mr-1 inline h-3 w-3" />{e.location}</span>}
                              {stat && (
                                <span><Users className="mr-1 inline h-3 w-3" />{stat.count}/{stat.capacity} คน</span>
                              )}
                            </div>
                            {e.description && (
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {selectedElectives.size > 0 && (
                      <p className="text-xs text-muted-foreground">
                        เลือกแล้ว {selectedElectives.size} หลักสูตร — จะลงทะเบียนพร้อมกับหลักสูตรหลักนี้
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right: registration form */}
          <div>
            <Card className="p-6">
              <h2 className="text-lg font-semibold">ลงทะเบียนเข้าร่วม</h2>
              <p className="mt-1 text-sm text-muted-foreground">กรอกข้อมูลเพื่อลงทะเบียน (ไม่ต้องสมัครสมาชิก)</p>

              {isFull ? (
                <Button className="mt-6 w-full" disabled>เต็มแล้ว</Button>
              ) : isElective ? (
                <div className="mt-5 space-y-3 rounded-md border border-amber-300/60 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    กรุณาลงทะเบียนหลักสูตรหลักก่อน
                  </div>
                  <p className="text-muted-foreground">
                    หลักสูตรนี้เป็น <span className="font-medium text-foreground">หลักสูตรเสริมทักษะ</span> เป็นการเรียนต่อเนื่อง
                    จากหลักสูตรหลัก — กรุณาลงทะเบียน <span className="font-medium text-foreground">{prereqLabel}</span> ก่อน
                    แล้วระบบจะให้คุณเลือกลงหลักสูตรนี้พร้อมกันในขั้นตอนเดียวได้
                  </p>
                  {recommendedCores && recommendedCores.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-medium text-foreground">หลักสูตรหลักที่แนะนำ:</div>
                      {recommendedCores.map((c) => (
                        <Link
                          key={c.id}
                          to="/trainings/$id"
                          params={{ id: c.id }}
                          className="block rounded-md border bg-background px-3 py-2 text-sm hover:border-primary hover:bg-muted/40"
                        >
                          <div className="font-medium text-foreground">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(c.start_date)}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link to="/trainings"><Button variant="outline" className="mt-2 w-full">ดูหลักสูตรหลักทั้งหมด</Button></Link>
                </div>
              ) : (
                <form
                  className="mt-5 space-y-3"
                  onSubmit={(e) => { e.preventDefault(); register.mutate(); }}
                >
                  <div>
                    <Label htmlFor="institute">สถาบัน *</Label>
                    <Select
                      value={form.instituteId}
                      onValueChange={(v) => setForm({ ...form, instituteId: v })}
                      disabled={institutesLoading || institutesError}
                    >
                      <SelectTrigger id="institute">
                        <SelectValue
                          placeholder={
                            institutesLoading
                              ? "กำลังโหลดสถาบัน..."
                              : institutesError
                              ? "โหลดสถาบันไม่สำเร็จ"
                              : "เลือกสถาบัน"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {institutes?.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.institute}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {institutesError && (
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-destructive">
                        <span>ไม่สามารถโหลดรายชื่อสถาบัน: {institutesErrorObj instanceof Error ? institutesErrorObj.message : "เกิดข้อผิดพลาด"}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => refetchInstitutes()}>
                          ลองใหม่
                        </Button>
                      </div>
                    )}
                    {!institutesLoading && !institutesError && institutes && institutes.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีรายการสถาบันในระบบ</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>เพศ *</Label>
                    <RadioGroup
                      className="mt-2 flex flex-wrap gap-6"
                      value={form.gender}
                      onValueChange={(v) => setForm({ ...form, gender: v })}
                    >
                      {["ชาย", "หญิง", "ไม่ระบุ"].map((g) => (
                        <div key={g} className="flex items-center gap-2">
                          <RadioGroupItem id={`gender-${g}`} value={g} />
                          <Label htmlFor={`gender-${g}`} className="font-normal">{g}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="age">อายุ (ปี) *</Label>
                    <Input id="age" type="number" min={1} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="education">ระดับการศึกษาในปัจจุบัน *</Label>
                    <Select value={form.educationLevel} onValueChange={(v) => setForm({ ...form, educationLevel: v })}>
                      <SelectTrigger id="education"><SelectValue placeholder="เลือกระดับการศึกษา" /></SelectTrigger>
                      <SelectContent>
                        {EDUCATION_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.educationLevel === "อื่นๆ" && (
                      <Input
                        className="mt-2"
                        placeholder="โปรดระบุ"
                        value={form.educationLevelOther}
                        onChange={(e) => setForm({ ...form, educationLevelOther: e.target.value })}
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="field">สาขา/ภาควิชาที่กำลังศึกษาอยู่ในปัจจุบัน</Label>
                    <Input id="field" value={form.fieldOfStudy} onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="pstatus">ท่านเข้าร่วมโครงการด้วยสถานะใด *</Label>
                    <Select value={form.participantStatus} onValueChange={(v) => setForm({ ...form, participantStatus: v })}>
                      <SelectTrigger id="pstatus"><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                      <SelectContent>
                        {PARTICIPANT_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.participantStatus === "อื่นๆ" && (
                      <Input
                        className="mt-2"
                        placeholder="โปรดระบุ"
                        value={form.participantStatusOther}
                        onChange={(e) => setForm({ ...form, participantStatusOther: e.target.value })}
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">อีเมล *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  {selectedElectives.size > 0 && (
                    <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
                      <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                      จะลงทะเบียนหลักสูตรเสริมทักษะเพิ่มอีก {selectedElectives.size} หลักสูตรพร้อมกัน
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 rounded-md border p-2 max-h-[100px] overflow-y-auto">
                      {PDPA_TEXT}
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed font-medium">
                      ข้าพเจ้าได้อ่านและรับทราบคำประกาศเกี่ยวกับความเป็นส่วนตัวแล้ว และให้ความยินยอมแก่ผู้จัดงานในการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า เพื่อวัตถุประสงค์ในการยืนยันตัวตนและเข้าร่วมงานอบรม
                    </p>
                    <div className="flex items-center gap-2 rounded-md border bg-primary/5 border-primary/20 p-2">
                      <Checkbox
                        id="pdpa-consent"
                        checked={consent}
                        onCheckedChange={(v) => setConsent(v === true)}
                      />
                      <Label htmlFor="pdpa-consent" className="text-xs font-semibold cursor-pointer">
                        ยอมรับ
                      </Label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={register.isPending || !consent}>
                    {register.isPending ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
