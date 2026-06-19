import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

export function CustomSurveyDashboard() {
  const [surveyId, setSurveyId] = useState<string>("");
  const [trainingId, setTrainingId] = useState<string>("all");

  const surveys = useQuery({
    queryKey: ["csd-surveys"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("surveys").select("id, title").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; title: string }>;
    },
  });

  const detail = useQuery({
    queryKey: ["csd-detail", surveyId],
    enabled: !!surveyId,
    queryFn: async () => {
      const [qRes, iRes] = await Promise.all([
        (supabase as any).from("survey_questions").select("*").eq("survey_id", surveyId).order("position"),
        (supabase as any).from("survey_invitations").select("id, training_id, submitted_at, gender, age_range, education, suggestions, trainings(id, title)").eq("survey_id", surveyId),
      ]);
      if (qRes.error) throw qRes.error;
      if (iRes.error) throw iRes.error;
      const invIds = (iRes.data ?? []).map((i: any) => i.id);
      const aRes = invIds.length
        ? await (supabase as any).from("survey_answers").select("*").in("invitation_id", invIds)
        : { data: [] };
      return {
        questions: qRes.data ?? [],
        invitations: iRes.data ?? [],
        answers: aRes.data ?? [],
      };
    },
  });

  // Reset training filter when survey changes
  const trainingOptions = useMemo(() => {
    const map = new Map<string, string>();
    (detail.data?.invitations ?? []).forEach((i: any) => {
      if (i.training_id && i.trainings?.title) map.set(i.training_id, i.trainings.title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [detail.data]);

  const filtered = useMemo(() => {
    if (!detail.data) return null;
    if (trainingId === "all") return detail.data;
    const invs = detail.data.invitations.filter((i: any) => i.training_id === trainingId);
    const ids = new Set(invs.map((i: any) => i.id));
    return {
      questions: detail.data.questions,
      invitations: invs,
      answers: detail.data.answers.filter((a: any) => ids.has(a.invitation_id)),
    };
  }, [detail.data, trainingId]);

  if (surveys.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">เลือกแบบสำรวจ:</label>
        <Select value={surveyId} onValueChange={(v) => { setSurveyId(v); setTrainingId("all"); }}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="-- เลือก --" />
          </SelectTrigger>
          <SelectContent>
            {surveys.data?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {surveyId && trainingOptions.length > 0 && (
          <>
            <label className="text-sm font-medium">หลักสูตร:</label>
            <Select value={trainingId} onValueChange={setTrainingId}>
              <SelectTrigger className="w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหลักสูตร ({trainingOptions.length})</SelectItem>
                {trainingOptions.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {!surveyId && (
        <Card className="p-10 text-center text-muted-foreground">
          กรุณาเลือกแบบสำรวจเพื่อดูผลสรุป
        </Card>
      )}

      {surveyId && detail.isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      )}

      {surveyId && filtered && <Report data={filtered} />}
    </div>
  );
}

function Report({ data }: { data: { questions: any[]; invitations: any[]; answers: any[] } }) {
  const { questions, invitations, answers } = data;
  const submitted = useMemo(() => invitations.filter(i => i.submitted_at), [invitations]);
  const rate = invitations.length ? Math.round((submitted.length / invitations.length) * 100) : 0;
  const ansByQ = useMemo(() => {
    const m: Record<string, any[]> = {};
    answers.forEach(a => { (m[a.question_id] ??= []).push(a); });
    return m;
  }, [answers]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="คำเชิญที่ส่ง" value={invitations.length} />
        <Stat label="ตอบกลับ" value={submitted.length} />
        <Stat label="อัตราตอบกลับ" value={`${rate}%`} highlight />
      </div>

      {questions.map((q, idx) => (
        <QuestionResult key={q.id} q={q} idx={idx} answers={ansByQ[q.id] ?? []} />
      ))}

      <SuggestionsCard items={submitted.filter(i => i.suggestions)} />
    </div>
  );
}

function QuestionResult({ q, idx, answers }: { q: any; idx: number; answers: any[] }) {
  const total = answers.length;
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold">{idx + 1}. {q.label}</h3>
        <Badge variant="secondary">{total} ตอบ</Badge>
      </div>

      {q.question_type === "rating" && <RatingChart answers={answers} max={q.rating_max ?? 5} />}
      {q.question_type === "single_choice" && <ChoiceChart answers={answers} options={q.options ?? []} field="value_text" />}
      {q.question_type === "multi_choice" && <ChoiceChart answers={answers} options={q.options ?? []} multi />}
      {(q.question_type === "short_text" || q.question_type === "long_text") && (
        <TextList answers={answers} />
      )}
    </Card>
  );
}

function RatingChart({ answers, max }: { answers: any[]; max: number }) {
  const nums = answers.map(a => Number(a.value_number)).filter(n => !isNaN(n));
  const avg = nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
  const data = Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return { score: String(n), count: nums.filter(v => v === n).length };
  });
  return (
    <div>
      <div className="text-3xl font-bold text-teal mb-2">{avg} <span className="text-sm font-normal text-muted-foreground">/ {max}</span></div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="score" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChoiceChart({ answers, options, field, multi }: { answers: any[]; options: string[]; field?: string; multi?: boolean }) {
  const counts: Record<string, number> = {};
  options.forEach(o => { counts[o] = 0; });
  answers.forEach(a => {
    const vals: string[] = multi ? (Array.isArray(a.value_json) ? a.value_json : []) : [a[field!]];
    vals.forEach(v => { if (v && counts[v] !== undefined) counts[v]++; });
  });
  const data = Object.entries(counts).map(([k, v]) => ({ option: k, count: v }));
  const colors = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, options.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="option" width={100} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TextList({ answers }: { answers: any[] }) {
  const texts = answers.map(a => a.value_text).filter(Boolean);
  if (!texts.length) return <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีคำตอบ</p>;
  return (
    <ul className="space-y-2 max-h-72 overflow-y-auto">
      {texts.map((t, i) => (
        <li key={i} className="border-l-4 border-teal/40 pl-3 py-1 text-sm">{t}</li>
      ))}
    </ul>
  );
}

function SuggestionsCard({ items }: { items: any[] }) {
  if (!items.length) return null;
  return (
    <Card className="p-5">
      <h3 className="font-bold mb-3">ข้อเสนอแนะเพิ่มเติม ({items.length})</h3>
      <ul className="space-y-2 max-h-80 overflow-y-auto">
        {items.map((i, idx) => (
          <li key={idx} className="border-l-4 border-teal/40 pl-3 py-1 text-sm">{i.suggestions}</li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "bg-teal/10 border-teal/30" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}
