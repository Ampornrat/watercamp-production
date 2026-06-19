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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getSurveyInvitationByToken, submitSurveyInvitation } from "@/lib/surveys.functions";

export const Route = createFileRoute("/s/$token")({
  head: () => ({ meta: [{ title: "แบบสำรวจ" }] }),
  component: SurveyFormPage,
});

type Q = {
  id: string;
  position: number;
  question_type: "rating" | "single_choice" | "multi_choice" | "short_text" | "long_text";
  label: string;
  description: string | null;
  required: boolean;
  options: string[] | null;
  rating_max: number | null;
};

function SurveyFormPage() {
  const { token } = Route.useParams();
  const getInv = useServerFn(getSurveyInvitationByToken);
  const submitInv = useServerFn(submitSurveyInvitation);
  const [demo, setDemo] = useState({ gender: "", age_range: "", education: "", suggestions: "" });
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const data = useQuery({
    queryKey: ["s-invite", token],
    queryFn: async () => {
      const res = await getInv({ data: { token } });
      if (!res) return null;
      return { inv: res.inv as any, questions: ((res.questions ?? []) as unknown) as Q[] };
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!data.data) throw new Error("ไม่พบแบบสำรวจ");
      const { inv, questions } = data.data;
      const survey = (inv as any).surveys;
      if (survey.collect_demographics) {
        if (!demo.gender || !demo.age_range || !demo.education)
          throw new Error("กรุณากรอกข้อมูลทั่วไปให้ครบ");
      }
      for (const q of questions) {
        if (!q.required) continue;
        const a = answers[q.id];
        if (a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0))
          throw new Error(`กรุณาตอบ: ${q.label}`);
      }

      const answerRows = questions.map(q => {
        const v = answers[q.id];
        const base: any = { question_id: q.id, value_number: null, value_text: null, value_json: null };
        if (q.question_type === "rating") base.value_number = v ? Number(v) : null;
        else if (q.question_type === "multi_choice") base.value_json = v ?? [];
        else if (q.question_type === "single_choice") base.value_text = v ?? null;
        else base.value_text = v ?? null;
        return base;
      });

      await submitInv({
        data: {
          token,
          demographics: {
            gender: demo.gender || null,
            age_range: demo.age_range || null,
            education: demo.education || null,
            suggestions: demo.suggestions || null,
          },
          answers: answerRows,
        },
      });
    },
    onSuccess: () => { toast.success("ขอบคุณสำหรับการประเมิน"); data.refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (data.isLoading) {
    return shell(<div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>);
  }
  if (!data.data) {
    return shell(<Card className="p-8 text-center">
      <h1 className="text-xl font-bold mb-2">ไม่พบแบบสำรวจ</h1>
      <p className="text-muted-foreground">ลิงก์อาจหมดอายุหรือไม่ถูกต้อง</p>
    </Card>);
  }

  const { inv, questions } = data.data;
  const survey = (inv as any).surveys;
  const t = (inv as any).trainings;
  const submitted = !!inv.submitted_at;

  if (submitted) {
    return shell(<Card className="p-8 text-center">
      <CheckCircle2 className="w-16 h-16 text-teal mx-auto mb-4" />
      <h1 className="text-xl font-bold mb-2">ขอบคุณสำหรับการประเมิน</h1>
      <p className="text-muted-foreground">บันทึกคำตอบของท่านเรียบร้อยแล้ว</p>
    </Card>);
  }

  return shell(
    <Card className="p-6 md:p-8 overflow-hidden">
      {t?.cover_image_url && (
        <div className="-mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-6 h-44 md:h-56 relative">
          <img src={t.cover_image_url} alt={t.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {t?.category && (
            <span className="absolute top-3 left-3 px-2 py-1 text-xs rounded bg-white/90 text-foreground font-medium">
              {t.category}
            </span>
          )}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h2 className="font-bold text-lg md:text-xl line-clamp-2">{t.title}</h2>
          </div>
        </div>
      )}
      {t && !t.cover_image_url && (
        <div className="-mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-6 p-4 md:p-6 bg-gradient-to-r from-teal/90 to-teal/70 text-white">
          {t.category && <div className="text-xs opacity-90 mb-1">{t.category}</div>}
          <h2 className="font-bold text-lg md:text-xl">{t.title}</h2>
        </div>
      )}
      <header className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-teal mb-1">{survey.title}</h1>
        {survey.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{survey.description}</p>}
        {t && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
            {t.instructor && <div><dt className="inline font-semibold">วิทยากร: </dt><dd className="inline text-muted-foreground">{t.instructor}</dd></div>}
            {t.location && <div><dt className="inline font-semibold">สถานที่: </dt><dd className="inline text-muted-foreground">{t.location}</dd></div>}
            {t.start_date && (
              <div className="sm:col-span-2">
                <dt className="inline font-semibold">วันที่: </dt>
                <dd className="inline text-muted-foreground">
                  {new Date(t.start_date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
                  {t.end_date && t.end_date !== t.start_date && ` – ${new Date(t.end_date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`}
                </dd>
              </div>
            )}
          </dl>
        )}
      </header>

      <form onSubmit={e => { e.preventDefault(); submit.mutate(); }} className="space-y-8">
        {survey.collect_demographics && (
          <section>
            <h2 className="font-bold mb-3 underline">ข้อมูลทั่วไป</h2>
            <div className="space-y-4">
              <RadioRow label="เพศ" value={demo.gender} onChange={v => setDemo(d => ({ ...d, gender: v }))}
                options={[{ v: "male", l: "ชาย" }, { v: "female", l: "หญิง" }]} />
              <RadioRow label="อายุ" value={demo.age_range} onChange={v => setDemo(d => ({ ...d, age_range: v }))}
                options={[{ v: "20-30", l: "20–30 ปี" }, { v: "31-40", l: "31–40 ปี" },
                          { v: "41-50", l: "41–50 ปี" }, { v: "51+", l: "51 ปีขึ้นไป" }]} />
              <RadioRow label="ระดับการศึกษา" value={demo.education} onChange={v => setDemo(d => ({ ...d, education: v }))}
                options={[{ v: "below_bachelor", l: "ต่ำกว่าปริญญาตรี" }, { v: "bachelor", l: "ปริญญาตรี" },
                          { v: "master", l: "ปริญญาโท" }, { v: "doctoral", l: "ปริญญาเอก" }]} />
            </div>
          </section>
        )}

        <section className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <Label className="font-medium block">
                {idx + 1}. {q.label} {q.required && <span className="text-destructive">*</span>}
              </Label>
              {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
              {renderInput(q, answers[q.id], v => setAnswers(a => ({ ...a, [q.id]: v })))}
            </div>
          ))}
        </section>

        {survey.collect_demographics && (
          <section>
            <Label>ข้อเสนอแนะเพิ่มเติม</Label>
            <Textarea rows={3} value={demo.suggestions}
              onChange={e => setDemo(d => ({ ...d, suggestions: e.target.value }))} />
          </section>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={submit.isPending} className="bg-teal hover:bg-teal/90">
            {submit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            ส่งแบบสอบถาม
          </Button>
        </div>
      </form>
    </Card>
  );
}

function renderInput(q: Q, value: any, onChange: (v: any) => void) {
  if (q.question_type === "rating") {
    const max = q.rating_max ?? 5;
    return (
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button"
            onClick={() => onChange(String(n))}
            className={`w-10 h-10 rounded-md border font-bold transition ${
              String(value) === String(n)
                ? "bg-teal text-white border-teal"
                : "bg-background hover:bg-muted"
            }`}
          >{n}</button>
        ))}
      </div>
    );
  }
  if (q.question_type === "single_choice") {
    return (
      <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-2">
        {(q.options ?? []).map((opt, i) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value={opt} /> <span>{opt}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }
  if (q.question_type === "multi_choice") {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {(q.options ?? []).map((opt, i) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={arr.includes(opt)}
              onCheckedChange={c => {
                onChange(c ? [...arr, opt] : arr.filter(x => x !== opt));
              }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.question_type === "short_text") {
    return <Input value={value ?? ""} onChange={e => onChange(e.target.value)} />;
  }
  return <Textarea rows={3} value={value ?? ""} onChange={e => onChange(e.target.value)} />;
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

function shell(children: React.ReactNode) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container max-w-3xl mx-auto py-8 px-4">{children}</main>
      <SiteFooter />
    </div>
  );
}
