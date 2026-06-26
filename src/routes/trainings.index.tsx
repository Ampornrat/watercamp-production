import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublishedTrainings } from "@/lib/trainings.functions";

export const Route = createFileRoute("/trainings/")({
  head: () => ({
    meta: [
      { title: "หลักสูตรฝึกอบรม | คลังข้อมูลน้ำแห่งชาติ" },
      { name: "description", content: "รายการหลักสูตรฝึกอบรมทั้งหมดที่เปิดรับลงทะเบียน" },
    ],
  }),
  component: TrainingsList,
});

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function TrainingsList() {
  const [q, setQ] = useState("");
  const getAll = useServerFn(getPublishedTrainings);
  const { data, isLoading } = useQuery({
    queryKey: ["trainings", "all"],
    queryFn: () => getAll(),
  });

  const filtered = (data ?? []).filter((t) =>
    t.title.toLowerCase().includes(q.toLowerCase()) ||
    (t.category ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">หลักสูตรฝึกอบรม</h1>
          <p className="mt-1 text-muted-foreground">เลือกหลักสูตรที่สนใจและลงทะเบียนเข้าร่วม</p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ค้นหาหลักสูตร..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">ไม่พบหลักสูตร</Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Card key={t.id} className="overflow-hidden shadow-card transition hover:shadow-soft">
                {t.cover_image_url ? (
                  <img src={t.cover_image_url} alt={t.title} className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-28 bg-gradient-primary" />
                )}
                <div className="p-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {t.course_type === "core"
                      ? <Badge>หลักสูตรหลัก</Badge>
                      : <Badge variant="outline">เสริมทักษะ</Badge>}
                    {t.category && <Badge variant="secondary">{t.category}</Badge>}
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold">{t.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{formatDate(t.start_date)}</div>
                    {t.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{t.location}</div>}
                    <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />รับ {t.capacity} คน</div>
                  </div>
                  <Link to="/trainings/$id" params={{ id: t.id }}>
                    <Button className="mt-4 w-full">ดูรายละเอียด</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
