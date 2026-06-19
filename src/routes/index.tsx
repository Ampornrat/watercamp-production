import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users, ArrowRight, Droplets, BookOpen, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ThaiWater Challenge | ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ" },
      { name: "description", content: "ลงทะเบียนเข้าร่วมหลักสูตรฝึกอบรมด้านการบริหารจัดการน้ำและคลังข้อมูล" },
    ],
  }),
  component: Index,
});

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function Index() {
  const { data: trainings } = useQuery({
    queryKey: ["trainings", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .eq("is_published", true)
        .order("start_date", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: trainingsCount } = useQuery({
    queryKey: ["trainings", "count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("trainings")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true);
      return count ?? 0;
    },
  });

  const { data: registrationsCount } = useQuery({
    queryKey: ["registrations", "count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_registrations_count");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const { data: institutesCount } = useQuery({
    queryKey: ["institutes", "count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("institutes_tab")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero pb-44 pt-24">
        {/* Decorative wave */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-20">
          <svg viewBox="0 0 1440 320" className="h-full w-full text-teal" fill="currentColor">
            <path d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L0,320Z" />
          </svg>
        </div>

        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-teal">
              National Hydroinformatics Data Center
            </span>
          </div>

          <h1 className="mx-auto mt-8 max-w-4xl font-heading text-5xl font-extrabold leading-[1.1] text-navy md:text-7xl">
            พัฒนาทักษะด้าน
            <br />
            <span className="text-gradient-teal">ข้อมูลน้ำระดับชาติ</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-teal md:text-xl">
            ลงทะเบียนเข้าร่วมหลักสูตรฝึกอบรมด้านเทคโนโลยีคลังข้อมูลน้ำ การวิเคราะห์ และการพยากรณ์ จากผู้เชี่ยวชาญระดับประเทศ เพื่ออนาคตที่ยั่งยืน
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/trainings">
              <Button
                size="lg"
                className="group rounded-2xl bg-teal px-8 py-6 text-base font-bold text-navy shadow-glow transition-all hover:-translate-y-0.5 hover:bg-teal/90"
              >
                ดูหลักสูตรทั้งหมด
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            {/* <Link to="/signup">
              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl border-white/20 bg-white/5 px-8 py-6 text-base font-bold text-white hover:bg-white/10 hover:text-white"
              >
                สมัครสมาชิกใหม่
              </Button>
            </Link> */}
          </div>
        </div>
      </section>

      {/* Floating stats */}
      <section className="container relative z-10 mx-auto -mt-24 px-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { icon: BookOpen, label: "หลักสูตรที่เปิดรับสมัคร", value: `${trainingsCount ?? 0}` },
            { icon: Users, label: "ผู้ลงทะเบียนทั้งหมด", value: `${registrationsCount ?? 0}` },
            { icon: Award, label: "สถาบันในเครือข่าย", value: `${institutesCount ?? 0}` },
          ].map((s) => (
            <Card
              key={s.label}
              className="group flex items-center gap-6 rounded-3xl border-border bg-card p-8 shadow-soft transition-colors hover:border-primary"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon className="h-7 w-7" />
              </div>
              <div>
                <div className="font-heading text-3xl font-extrabold text-foreground">{s.value}</div>
                <div className="text-sm font-medium text-muted-foreground">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured trainings */}
      <section className="container mx-auto px-4 pb-24 pt-24">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              หลักสูตรที่เปิดรับสมัคร
            </h2>
            <p className="text-muted-foreground">เลือกหลักสูตรที่ตรงกับความสนใจและยกระดับทักษะของคุณ</p>
          </div>
          <Link
            to="/trainings"
            className="inline-flex items-center gap-2 font-bold text-primary transition-colors hover:text-primary/80"
          >
            ดูหลักสูตรทั้งหมด <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {trainings && trainings.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trainings.map((t) => (
              <Card key={t.id} className="group overflow-hidden rounded-3xl border-border shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
                {t.cover_image_url ? (
                  <img src={t.cover_image_url} alt={t.title} className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-32 bg-gradient-primary" />
                )}
                <div className="p-6">
                  {t.category && <Badge variant="secondary" className="mb-3">{t.category}</Badge>}
                  <h3 className="line-clamp-2 font-heading text-lg font-bold text-foreground">{t.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{formatDate(t.start_date)} - {formatDate(t.end_date)}</div>
                    {t.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{t.location}</div>}
                    <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />รับ {t.capacity} คน</div>
                  </div>
                  <Link to="/trainings/$id" params={{ id: t.id }}>
                    <Button className="mt-5 w-full rounded-xl" variant="outline">ดูรายละเอียด</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-border bg-muted/40 px-10 py-24 text-center">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto flex h-24 w-24 rotate-3 items-center justify-center rounded-3xl bg-card text-muted-foreground/40 shadow-xl">
                <Droplets className="h-12 w-12" />
              </div>
              <h3 className="mt-8 font-heading text-xl font-bold text-foreground">ยังไม่มีหลักสูตรที่เปิดรับสมัครในขณะนี้</h3>
              <p className="mt-2 text-muted-foreground">ติดตามข่าวสารการอัปเดตหลักสูตรใหม่ๆ ได้ที่นี่ เร็วๆ นี้</p>
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
