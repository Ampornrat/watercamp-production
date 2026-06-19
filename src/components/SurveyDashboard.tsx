import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const QUESTION_LABELS: Record<string, string> = {
  rating_knowledge: "ความรู้ที่ได้รับ",
  rating_application: "การนำไปใช้ในงาน",
  rating_instructor: "ความสามารถวิทยากร",
  rating_assistant: "ผู้ช่วยวิทยากร",
  rating_materials: "เอกสารประกอบ",
  rating_duration: "ระยะเวลา",
  rating_venue: "สถานที่",
  rating_equipment: "อุปกรณ์",
};

const GENDER_LABELS: Record<string, string> = { male: "ชาย", female: "หญิง" };
const AGE_LABELS: Record<string, string> = {
  "20-30": "20-30 ปี", "31-40": "31-40 ปี", "41-50": "41-50 ปี", "51+": "51 ปีขึ้นไป",
};
const EDU_LABELS: Record<string, string> = {
  below_bachelor: "ต่ำกว่าปริญญาตรี", bachelor: "ปริญญาตรี",
  master: "ปริญญาโท", doctoral: "ปริญญาเอก",
};

const COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function SurveyDashboard() {
  const [trainingFilter, setTrainingFilter] = useState<string>("all");

  const trainings = useQuery({
    queryKey: ["dash-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("id,title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const surveys = useQuery({
    queryKey: ["dash-surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*, trainings(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const all = surveys.data ?? [];
    if (trainingFilter === "all") return all;
    return all.filter((s: any) => s.training_id === trainingFilter);
  }, [surveys.data, trainingFilter]);

  const submitted = useMemo(() => filtered.filter((s: any) => s.submitted_at), [filtered]);
  const responseRate = filtered.length > 0
    ? Math.round((submitted.length / filtered.length) * 100) : 0;

  const overallAvg = useMemo(() => {
    if (submitted.length === 0) return 0;
    let sum = 0, n = 0;
    submitted.forEach((s: any) => {
      Object.keys(QUESTION_LABELS).forEach(k => {
        if (typeof s[k] === "number") { sum += s[k]; n++; }
      });
    });
    return n > 0 ? +(sum / n).toFixed(2) : 0;
  }, [submitted]);

  const ratingData = useMemo(() => {
    return Object.entries(QUESTION_LABELS).map(([k, label]) => {
      const vals = submitted.map((s: any) => s[k]).filter((v: any) => typeof v === "number");
      const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      return { question: label, avg: +avg.toFixed(2), count: vals.length };
    });
  }, [submitted]);

  const genderData = useMemo(() => buildPie(submitted, "gender", GENDER_LABELS), [submitted]);
  const ageData = useMemo(() => buildPie(submitted, "age_range", AGE_LABELS), [submitted]);
  const eduData = useMemo(() => buildPie(submitted, "education", EDU_LABELS), [submitted]);

  const suggestions = useMemo(
    () => submitted.filter((s: any) => s.suggestions && s.suggestions.trim()).slice(0, 20),
    [submitted],
  );

  if (surveys.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">หลักสูตร:</label>
        <Select value={trainingFilter} onValueChange={setTrainingFilter}>
          <SelectTrigger className="w-80"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหลักสูตร</SelectItem>
            {trainings.data?.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="จำนวนคำเชิญ" value={filtered.length} />
        <StatCard label="ตอบกลับแล้ว" value={submitted.length} />
        <StatCard label="อัตราตอบกลับ" value={`${responseRate}%`} />
        <StatCard
          label="คะแนนเฉลี่ยรวม"
          value={overallAvg ? `${overallAvg} / 5` : "-"}
          highlight
        />
      </div>

      {/* Ratings bar chart */}
      <Card className="p-5">
        <h3 className="font-bold mb-4">คะแนนเฉลี่ยรายข้อ (เต็ม 5)</h3>
        {submitted.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={ratingData} layout="vertical" margin={{ left: 130 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 5]} />
              <YAxis type="category" dataKey="question" width={130} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#0ea5e9" radius={[0, 6, 6, 0]}>
                {ratingData.map((d, i) => (
                  <Cell key={i} fill={d.avg >= 4 ? "#14b8a6" : d.avg >= 3 ? "#0ea5e9" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Demographics */}
      <div className="grid gap-4 md:grid-cols-3">
        <DemoCard title="เพศ" data={genderData} />
        <DemoCard title="ช่วงอายุ" data={ageData} />
        <DemoCard title="ระดับการศึกษา" data={eduData} />
      </div>

      {/* Suggestions */}
      <Card className="p-5">
        <h3 className="font-bold mb-4">ข้อเสนอแนะเพิ่มเติม ({suggestions.length})</h3>
        {suggestions.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">ยังไม่มีข้อเสนอแนะ</p>
        ) : (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((s: any) => (
              <li key={s.id} className="border-l-4 border-teal/40 pl-3 py-1 text-sm">
                <p>{s.suggestions}</p>
                <div className="mt-1 text-xs text-muted-foreground flex gap-2">
                  <span>{s.trainings?.title}</span>
                  <span>·</span>
                  <span>{new Date(s.submitted_at).toLocaleDateString("th-TH")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* All responses table */}
      <Card className="p-5">
        <h3 className="font-bold mb-4">คำเชิญทั้งหมด ({filtered.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">หลักสูตร</th>
                <th className="p-2">อีเมล</th>
                <th className="p-2">สถานะ</th>
                <th className="p-2">วันที่ตอบ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.trainings?.title || "-"}</td>
                  <td className="p-2 text-xs">{s.recipient_email}</td>
                  <td className="p-2">
                    {s.submitted_at
                      ? <Badge className="bg-teal">ตอบแล้ว</Badge>
                      : <Badge variant="secondary">รอตอบ</Badge>}
                  </td>
                  <td className="p-2 text-xs">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleString("th-TH") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "bg-teal/10 border-teal/30" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function DemoCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <Card className="p-5">
      <h3 className="font-bold mb-2">{title}</h3>
      {total === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={70} label>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

function buildPie(rows: any[], key: string, labels: Record<string, string>) {
  const counts: Record<string, number> = {};
  rows.forEach(r => {
    const v = r[key];
    if (v) counts[v] = (counts[v] ?? 0) + 1;
  });
  return Object.entries(counts).map(([k, value]) => ({
    name: labels[k] ?? k,
    value,
  }));
}
