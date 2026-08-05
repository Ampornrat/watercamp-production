import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getAllInstitutes } from "@/lib/trainings.functions";
import { createSimRequest } from "@/lib/sim-register.functions";

export const Route = createFileRoute("/sim-register")({
  head: () => ({
    meta: [{ title: "แบบฟอร์มลงทะเบียนขอ SIM โทรศัพท์ | ThaiWater Challenge" }],
  }),
  component: SimRegisterPage,
});

const EDUCATION_LEVELS = ["ปวส.", "ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก", "อื่นๆ"];
const GENDERS = [
  { value: "ชาย", label: "ชาย" },
  { value: "หญิง", label: "หญิง" },
  { value: "ไม่ระบุ", label: "ไม่ระบุ" },
];

type FormData = {
  institute_id: string;
  student_id: string;
  full_name: string;
  gender: string;
  age: string;
  education_level: string;
  field_of_study: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = {
  institute_id: "",
  student_id: "",
  full_name: "",
  gender: "",
  age: "",
  education_level: "",
  field_of_study: "",
  email: "",
};

function validate(f: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!f.institute_id) errors.institute_id = "กรุณาเลือกสถาบัน";
  if (!f.student_id.trim()) errors.student_id = "กรุณากรอกรหัสนักศึกษา";
  if (!f.full_name.trim()) errors.full_name = "กรุณากรอกชื่อ-นามสกุล";
  if (!f.gender) errors.gender = "กรุณาเลือกเพศ";
  if (!f.age) {
    errors.age = "กรุณากรอกอายุ";
  } else {
    const n = Number(f.age);
    if (!Number.isInteger(n) || n < 15 || n > 80) errors.age = "อายุต้องอยู่ระหว่าง 15-80 ปี";
  }
  if (!f.education_level) errors.education_level = "กรุณาเลือกระดับการศึกษา";
  if (!f.field_of_study.trim()) errors.field_of_study = "กรุณากรอกสาขา/ภาควิชา";
  if (!f.email.trim()) {
    errors.email = "กรุณากรอกอีเมล";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }
  return errors;
}

function SimRegisterPage() {
  const getInstitutes = useServerFn(getAllInstitutes);
  const submitFn = useServerFn(createSimRequest);

  const { data: institutes = [] } = useQuery({
    queryKey: ["institutes", "all"],
    queryFn: () => getInstitutes(),
  });

  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          institute_id: form.institute_id,
          student_id: form.student_id.trim(),
          full_name: form.full_name.trim(),
          gender: form.gender,
          age: Number(form.age),
          education_level: form.education_level,
          field_of_study: form.field_of_study.trim(),
          email: form.email.trim(),
        },
      });
      setSubmitted(true);
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="container mx-auto flex-1 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-2xl font-extrabold text-foreground md:text-3xl">
              แบบฟอร์มลงทะเบียนขอ SIM โทรศัพท์
            </h1>
          </div>

          {submitted ? (
            <Card className="rounded-3xl shadow-soft">
              <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
                <h2 className="font-heading text-2xl font-extrabold text-foreground">
                  ลงทะเบียนรับ SIM โทรศัพท์สำเร็จ
                </h2>
                <p className="text-muted-foreground">เราจะติดต่อกลับทาง email ของท่าน</p>
                <Link to="/">
                  <Button size="lg" className="rounded-xl px-8">
                    กลับหน้า Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-muted-foreground">
                กรุณากรอกข้อมูลให้ครบถ้วน (<span className="text-destructive">*</span> จำเป็นต้องกรอก)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* สถาบัน */}
                <div className="space-y-1.5">
                  <Label htmlFor="institute">
                    เลือกสถาบัน <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.institute_id} onValueChange={(v) => set("institute_id", v)}>
                    <SelectTrigger id="institute" className={errors.institute_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="เลือกสถาบัน" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutes.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.institute_id && <p className="text-xs text-destructive">{errors.institute_id}</p>}
                </div>

                {/* รหัสนักศึกษา */}
                <div className="space-y-1.5">
                  <Label htmlFor="student_id">
                    รหัสนักศึกษา <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="student_id"
                    type="text"
                    placeholder="เช่น 6401234567"
                    value={form.student_id}
                    onChange={(e) => set("student_id", e.target.value)}
                    className={errors.student_id ? "border-destructive" : ""}
                  />
                  {errors.student_id && <p className="text-xs text-destructive">{errors.student_id}</p>}
                </div>

                {/* ชื่อ-นามสกุล */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">
                    ชื่อ-นามสกุล <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="ชื่อ นามสกุล"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    className={errors.full_name ? "border-destructive" : ""}
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>

                {/* เพศ */}
                <div className="space-y-1.5">
                  <Label>
                    เพศ <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    value={form.gender}
                    onValueChange={(v) => set("gender", v)}
                    className="flex flex-wrap gap-4"
                  >
                    {GENDERS.map((g) => (
                      <div key={g.value} className="flex items-center gap-2">
                        <RadioGroupItem value={g.value} id={`gender-${g.value}`} />
                        <Label htmlFor={`gender-${g.value}`} className="cursor-pointer font-normal">
                          {g.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
                </div>

                {/* อายุ */}
                <div className="space-y-1.5">
                  <Label htmlFor="age">
                    อายุ <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min={15}
                    max={80}
                    placeholder="อายุ (ปี)"
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                    className={errors.age ? "border-destructive" : ""}
                  />
                  {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
                </div>

                {/* ระดับการศึกษา */}
                <div className="space-y-1.5">
                  <Label htmlFor="education_level">
                    ระดับการศึกษาปัจจุบัน <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.education_level} onValueChange={(v) => set("education_level", v)}>
                    <SelectTrigger id="education_level" className={errors.education_level ? "border-destructive" : ""}>
                      <SelectValue placeholder="เลือกระดับการศึกษา" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.education_level && <p className="text-xs text-destructive">{errors.education_level}</p>}
                </div>

                {/* สาขา */}
                <div className="space-y-1.5">
                  <Label htmlFor="field_of_study">
                    สาขา/ภาควิชาที่กำลังศึกษาอยู่ปัจจุบัน <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="field_of_study"
                    type="text"
                    placeholder="เช่น วิศวกรรมสิ่งแวดล้อม"
                    value={form.field_of_study}
                    onChange={(e) => set("field_of_study", e.target.value)}
                    className={errors.field_of_study ? "border-destructive" : ""}
                  />
                  {errors.field_of_study && <p className="text-xs text-destructive">{errors.field_of_study}</p>}
                </div>

                {/* อีเมล */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    อีเมล <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <Button type="submit" disabled={submitting} className="w-full rounded-xl" size="lg">
                  {submitting ? "กำลังส่ง..." : "ส่งแบบฟอร์ม"}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
