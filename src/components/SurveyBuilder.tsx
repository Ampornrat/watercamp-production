import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type QType = "rating" | "single_choice" | "multi_choice" | "short_text" | "long_text";

interface Question {
  id?: string;
  position: number;
  question_type: QType;
  label: string;
  description?: string | null;
  required: boolean;
  options?: string[] | null;
  rating_max?: number | null;
}

interface SurveyForm {
  id?: string;
  title: string;
  description: string;
  is_active: boolean;
  collect_demographics: boolean;
  questions: Question[];
}

const TYPE_LABELS: Record<QType, string> = {
  rating: "ให้คะแนน (1–5)",
  single_choice: "ตัวเลือกเดียว",
  multi_choice: "เลือกได้หลายข้อ",
  short_text: "ข้อความสั้น",
  long_text: "ข้อความยาว",
};

const empty: SurveyForm = {
  title: "", description: "", is_active: true, collect_demographics: true, questions: [],
};

export function SurveyBuilder() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SurveyForm>(empty);

  const surveys = useQuery({
    queryKey: ["sb-surveys"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("surveys")
        .select("*, survey_questions(count), survey_invitations(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const loadForEdit = async (id: string) => {
    const { data: s, error } = await (supabase as any).from("surveys").select("*").eq("id", id).single();
    if (error) { toast.error(error.message); return; }
    const { data: qs } = await (supabase as any)
      .from("survey_questions")
      .select("*")
      .eq("survey_id", id)
      .order("position");
    setForm({
      id: s.id,
      title: s.title,
      description: s.description ?? "",
      is_active: s.is_active,
      collect_demographics: s.collect_demographics,
      questions: (qs ?? []).map((q: any) => ({
        id: q.id,
        position: q.position,
        question_type: q.question_type,
        label: q.label,
        description: q.description,
        required: q.required,
        options: q.options ?? [],
        rating_max: q.rating_max ?? 5,
      })),
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async (f: SurveyForm) => {
      if (!f.title.trim()) throw new Error("กรุณากรอกชื่อแบบสำรวจ");
      if (f.questions.length === 0) throw new Error("กรุณาเพิ่มอย่างน้อย 1 คำถาม");
      const payload = {
        title: f.title.trim(),
        description: f.description || null,
        is_active: f.is_active,
        collect_demographics: f.collect_demographics,
      };
      let surveyId = f.id;
      if (surveyId) {
        const { error } = await (supabase as any).from("surveys").update(payload).eq("id", surveyId);
        if (error) throw error;
        await (supabase as any).from("survey_questions").delete().eq("survey_id", surveyId);
      } else {
        const { data, error } = await (supabase as any).from("surveys").insert(payload).select("id").single();
        if (error) throw error;
        surveyId = data.id;
      }
      const rows = f.questions.map((q, i) => ({
        survey_id: surveyId,
        position: i,
        question_type: q.question_type,
        label: q.label,
        description: q.description || null,
        required: q.required,
        options: ["single_choice", "multi_choice"].includes(q.question_type)
          ? (q.options ?? []).filter(Boolean)
          : null,
        rating_max: q.question_type === "rating" ? (q.rating_max ?? 5) : null,
      }));
      if (rows.length) {
        const { error } = await (supabase as any).from("survey_questions").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("บันทึกแบบสำรวจแล้ว");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["sb-surveys"] });
      qc.invalidateQueries({ queryKey: ["sb-surveys-active"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("ลบแล้ว"); qc.invalidateQueries({ queryKey: ["sb-surveys"] }); },
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { data: s } = await (supabase as any).from("surveys").select("*").eq("id", id).single();
      const { data: qs } = await (supabase as any).from("survey_questions").select("*").eq("survey_id", id).order("position");
      const { data: ns, error } = await (supabase as any).from("surveys").insert({
        title: s.title + " (สำเนา)", description: s.description,
        is_active: false, collect_demographics: s.collect_demographics,
      }).select("id").single();
      if (error) throw error;
      if (qs?.length) {
        await (supabase as any).from("survey_questions").insert(
          qs.map((q: any) => ({
            survey_id: ns.id, position: q.position, question_type: q.question_type,
            label: q.label, description: q.description, required: q.required,
            options: q.options, rating_max: q.rating_max,
          }))
        );
      }
    },
    onSuccess: () => { toast.success("ทำสำเนาแล้ว"); qc.invalidateQueries({ queryKey: ["sb-surveys"] }); },
  });

  const addQ = (type: QType) => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, {
        position: f.questions.length, question_type: type, label: "",
        required: true, options: type.includes("choice") ? ["", ""] : [], rating_max: 5,
      }],
    }));
  };

  const updateQ = (i: number, patch: Partial<Question>) => {
    setForm(f => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? { ...q, ...patch } : q) }));
  };
  const removeQ = (i: number) => setForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  const moveQ = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.questions.length) return;
    const arr = [...form.questions];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setForm(f => ({ ...f, questions: arr }));
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/admin?survey=${id}`;
    navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์แล้ว (สำหรับใช้กับปุ่ม 'ส่งแบบสำรวจ')");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">แบบสำรวจที่สร้างเอง</h2>
          <p className="text-sm text-muted-foreground">ออกแบบคำถามแบบยืดหยุ่น แล้วส่งให้ผู้เข้าฝึกอบรมผ่านอีเมล</p>
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="bg-gradient-primary">
          <Plus className="mr-1 h-4 w-4" />สร้างแบบสำรวจ
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อแบบสำรวจ</TableHead>
              <TableHead>คำถาม</TableHead>
              <TableHead>ส่งแล้ว</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.data?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                ยังไม่มีแบบสำรวจ — กดปุ่ม "สร้างแบบสำรวจ" เพื่อเริ่มต้น
              </TableCell></TableRow>
            )}
            {surveys.data?.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.title}</div>
                  {s.description && <div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div>}
                </TableCell>
                <TableCell>{s.survey_questions?.[0]?.count ?? 0} ข้อ</TableCell>
                <TableCell>{s.survey_invitations?.[0]?.count ?? 0} คน</TableCell>
                <TableCell>
                  {s.is_active ? <Badge>ใช้งาน</Badge> : <Badge variant="secondary">ปิด</Badge>}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(s.id)} title="คัดลอก ID">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate.mutate(s.id)} title="ทำสำเนา">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => loadForEdit(s.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm("ลบแบบสำรวจนี้? คำตอบทั้งหมดจะถูกลบด้วย")) remove.mutate(s.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "แก้ไขแบบสำรวจ" : "สร้างแบบสำรวจใหม่"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>ชื่อแบบสำรวจ *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>คำอธิบาย / คำชี้แจง</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>เปิดใช้งาน</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.collect_demographics} onCheckedChange={v => setForm({ ...form, collect_demographics: v })} />
                <Label>เก็บข้อมูลทั่วไป (เพศ/อายุ/การศึกษา)</Label>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">คำถาม ({form.questions.length})</h3>
                <div className="flex gap-1 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as QType[]).map(t => (
                    <Button key={t} size="sm" variant="outline" onClick={() => addQ(t)}>
                      <Plus className="h-3 w-3 mr-1" />{TYPE_LABELS[t]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {form.questions.map((q, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex flex-col gap-1 pt-1">
                        <button type="button" onClick={() => moveQ(i, -1)} className="text-muted-foreground hover:text-foreground text-xs">▲</button>
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <button type="button" onClick={() => moveQ(i, 1)} className="text-muted-foreground hover:text-foreground text-xs">▼</button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline">{i + 1}</Badge>
                          <Badge>{TYPE_LABELS[q.question_type]}</Badge>
                          <div className="flex items-center gap-1 ml-auto">
                            <Switch checked={q.required} onCheckedChange={v => updateQ(i, { required: v })} />
                            <Label className="text-xs">บังคับตอบ</Label>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeQ(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="คำถาม *"
                          value={q.label}
                          onChange={e => updateQ(i, { label: e.target.value })}
                        />
                        <Input
                          placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
                          value={q.description ?? ""}
                          onChange={e => updateQ(i, { description: e.target.value })}
                          className="text-sm"
                        />

                        {q.question_type === "rating" && (
                          <div className="flex items-center gap-2 text-sm">
                            <Label>คะแนนสูงสุด:</Label>
                            <Select
                              value={String(q.rating_max ?? 5)}
                              onValueChange={v => updateQ(i, { rating_max: parseInt(v, 10) })}
                            >
                              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[3, 4, 5, 7, 10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {(q.question_type === "single_choice" || q.question_type === "multi_choice") && (
                          <div className="space-y-1">
                            <Label className="text-xs">ตัวเลือก</Label>
                            {(q.options ?? []).map((opt, oi) => (
                              <div key={oi} className="flex gap-1">
                                <Input
                                  value={opt}
                                  placeholder={`ตัวเลือกที่ ${oi + 1}`}
                                  onChange={e => {
                                    const opts = [...(q.options ?? [])];
                                    opts[oi] = e.target.value;
                                    updateQ(i, { options: opts });
                                  }}
                                />
                                <Button size="sm" variant="ghost" onClick={() => {
                                  updateQ(i, { options: (q.options ?? []).filter((_, x) => x !== oi) });
                                }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={() => {
                              updateQ(i, { options: [...(q.options ?? []), ""] });
                            }}>
                              <Plus className="h-3 w-3 mr-1" />เพิ่มตัวเลือก
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {form.questions.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded">
                    ยังไม่มีคำถาม — กดปุ่มด้านบนเพื่อเพิ่ม
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-gradient-primary">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
