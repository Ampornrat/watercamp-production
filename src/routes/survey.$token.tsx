import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getSurveyResponseByToken, submitSurveyResponse } from "@/lib/surveys.functions";

export const Route = createFileRoute("/survey/$token")({
  head: () => ({ meta: [{ title: "แบบสำรวจความพึงพอใจ" }] }),
  component: SurveyPage,
});

const SCALE = [
  { value: "5", label: "มากที่สุด" },
  { value: "4", label: "มาก" },
  { value: "3", label: "ปานกลาง" },
  { value: "2", label: "น้อย" },
  { value: "1", label: "น้อยที่สุด" },
];

const COURSE_QUESTIONS = [
  { key: "rating_knowledge", label: "1. ความรู้ที่ได้รับจากการฝึกอบรม" },
  { key: "rating_application", label: "2. การนำความรู้ไปใช้ประโยชน์ต่องานประจำ" },
  { key: "rating_instructor", label: "3. ความสามารถในการถ่ายทอดของวิทยากร" },
  { key: "rating_assistant", label: "4. ความสามารถและการเอาใจใส่ของผู้ช่วยวิทยากร" },
  { key: "rating_materials", label: "5. ความเหมาะสมของเอกสารประกอบการฝึกอบรม" },
] as const;

const OPS_QUESTIONS = [
  { key: "rating_duration", label: "1. ความเหมาะสมของระยะเวลาที่ใช้ในการฝึกอบรม" },
  { key: "rating_venue", label: "2. ความเหมาะสมของสถานที่จัดฝึกอบรม" },
  { key: "rating_equipment", label: "3. ความเหมาะสมของอุปกรณ์ต่างๆ ที่ใช้ในการฝึกอบรม" },
] as const;

type FormState = Record<string, string> & { suggestions: string };

function SurveyPage() {
  const { token } = Route.useParams();
  const getSurvey = useServerFn(getSurveyResponseByToken);
  const submitSurvey = useServerFn(submitSurveyResponse);
  const [form, setForm] = useState<FormState>({
    gender: "", age_range: "", education: "",
    rating_knowledge: "", rating_application: "", rating_instructor: "",
    rating_assistant: "", rating_materials: "",
    rating_duration: "", rating_venue: "", rating_equipment: "",
    suggestions: "",
  });

  const survey = useQuery({
    queryKey: ["survey", token],
    queryFn: () => getSurvey({ data: { token } }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const required = [
        "gender", "age_range", "education",
        ...COURSE_QUESTIONS.map(q => q.key),
        ...OPS_QUESTIONS.map(q => q.key),
      ];
      for (const k of required) {
        if (!form[k]) throw new Error("กรุณาตอบคำถามให้ครบทุกข้อ");
      }
      await submitSurvey({
        data: {
          token,
          gender: form.gender,
          age_range: form.age_range,
          education: form.education,
          suggestions: form.suggestions || null,
          rating_knowledge: parseInt(form.rating_knowledge, 10),
          rating_application: parseInt(form.rating_application, 10),
          rating_instructor: parseInt(form.rating_instructor, 10),
          rating_assistant: parseInt(form.rating_assistant, 10),
          rating_materials: parseInt(form.rating_materials, 10),
          rating_duration: parseInt(form.rating_duration, 10),
          rating_venue: parseInt(form.rating_venue, 10),
          rating_equipment: parseInt(form.rating_equipment, 10),
        },
      });
    },
    onSuccess: () => {
      toast.success("ขอบคุณสำหรับการประเมิน");
      survey.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (survey.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!survey.data) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container max-w-2xl mx-auto py-16 px-4">
          <Card className="p-8 text-center">
            <h1 className="text-xl font-bold mb-2">ไม่พบแบบสำรวจ</h1>
            <p className="text-muted-foreground">ลิงก์อาจหมดอายุหรือไม่ถูกต้อง</p>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const t: any = survey.data.trainings;
  const isSubmitted = !!survey.data.submitted_at;

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container max-w-2xl mx-auto py-16 px-4">
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-teal mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">ขอบคุณสำหรับการประเมิน</h1>
            <p className="text-muted-foreground">
              ระบบได้บันทึกความคิดเห็นของท่านเรียบร้อยแล้ว ความคิดเห็นของท่านจะช่วยให้เราพัฒนาหลักสูตรได้ดียิ่งขึ้น
            </p>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container max-w-3xl mx-auto py-8 px-4">
        <Card className="p-6 md:p-8">
          <header className="mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-teal mb-2">แบบสอบถามสำรวจความพึงพอใจในการเข้าร่วมโครงการฝึกอบรม</h1>
            {t?.title && <p className="text-lg font-semibold">หัวข้อ: {t.title}</p>}
            {t?.instructor && <p className="text-sm text-muted-foreground">วิทยากร: {t.instructor}</p>}
          </header>

          <form
            onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
            className="space-y-8"
          >
            {/* Section 1 */}
            <section>
              <h2 className="font-bold text-base mb-4 underline">ตอนที่ 1 ข้อมูลทั่วไป</h2>
              <div className="space-y-5">
                <RadioRow label="1. เพศ" value={form.gender} onChange={set("gender")}
                  options={[{ v: "male", l: "ชาย" }, { v: "female", l: "หญิง" }]} />
                <RadioRow label="2. อายุ" value={form.age_range} onChange={set("age_range")}
                  options={[
                    { v: "20-30", l: "20 – 30 ปี" },
                    { v: "31-40", l: "31 – 40 ปี" },
                    { v: "41-50", l: "41 – 50 ปี" },
                    { v: "51+", l: "51 ปีขึ้นไป" },
                  ]} />
                <RadioRow label="3. ระดับการศึกษา" value={form.education} onChange={set("education")}
                  options={[
                    { v: "below_bachelor", l: "ต่ำกว่าปริญญาตรี" },
                    { v: "bachelor", l: "ปริญญาตรี" },
                    { v: "master", l: "ปริญญาโท" },
                    { v: "doctoral", l: "ปริญญาเอก" },
                  ]} />
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="font-bold text-base mb-4 underline">ตอนที่ 2 ข้อมูลเกี่ยวกับหลักสูตร</h2>
              <RatingTable items={COURSE_QUESTIONS} form={form} setForm={setForm} />
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="font-bold text-base mb-4 underline">ตอนที่ 3 ข้อมูลเกี่ยวกับการดำเนินงาน</h2>
              <RatingTable items={OPS_QUESTIONS} form={form} setForm={setForm} />
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="font-bold text-base mb-4 underline">ตอนที่ 4 ข้อเสนอแนะเพิ่มเติม</h2>
              <Label htmlFor="suggestions">ความคิดเห็น / ข้อเสนอแนะ</Label>
              <Textarea
                id="suggestions"
                rows={4}
                value={form.suggestions}
                onChange={(e) => setForm(f => ({ ...f, suggestions: e.target.value }))}
                placeholder="เช่น สิ่งที่ประทับใจ สิ่งที่ควรปรับปรุง หรือหัวข้อที่อยากให้จัดเพิ่มเติม"
              />
            </section>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="submit" disabled={submit.isPending} className="bg-teal hover:bg-teal/90">
                {submit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                ส่งแบบสอบถาม
              </Button>
            </div>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

function RadioRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <Label className="font-medium mb-2 block">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-4">
        {options.map(o => (
          <label key={o.v} className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value={o.v} /> <span>{o.l}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function RatingTable({ items, form, setForm }: {
  items: readonly { key: string; label: string }[];
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 border-r">หัวข้อ</th>
            {SCALE.map(s => <th key={s.value} className="p-2 text-center min-w-[70px]">{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.key} className="border-t">
              <td className="p-2 border-r align-top">{item.label}</td>
              {SCALE.map(s => (
                <td key={s.value} className="text-center p-2">
                  <input
                    type="radio"
                    name={item.key}
                    value={s.value}
                    checked={form[item.key] === s.value}
                    onChange={() => setForm(f => ({ ...f, [item.key]: s.value }))}
                    className="w-4 h-4 cursor-pointer accent-teal"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
