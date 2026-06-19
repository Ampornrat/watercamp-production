import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Video, Smartphone, Lightbulb, Megaphone, Hash, Trophy, ArrowRight, Upload } from "lucide-react";

export const Route = createFileRoute("/contest/")({
  component: ContestRulesPage,
});

const RULES = [
  { icon: Video, title: "รูปแบบ", desc: "วิดีโอสั้น (1-3 นาที) บน TikTok, Reels หรือ YouTube Shorts" },
  { icon: Smartphone, title: "เนื้อหา", desc: "สาธิตฟีเจอร์แอป ThaiWater เช่น การดูเรดาร์ฝน เช็คระดับน้ำ และติดตามสถานการณ์น้ำ" },
  { icon: Lightbulb, title: "แนวทาง", desc: "นำเสนอแบบ \"Edutainment\" (สนุกและได้ความรู้) เช่น คลิป POV หรือรีวิวแอปแนววัยรุ่น" },
  { icon: Megaphone, title: "Call to Action", desc: "ช่วงท้ายต้องเชิญชวนให้ดาวน์โหลดแอป ThaiWater" },
  { icon: Hash, title: "การโพสต์", desc: "ตั้งค่าสาธารณะ พร้อมติดแฮชแท็ก #Thaiwater #วัยรุ่นรู้ทันน้ำ #thaiwaterambassador และ #สสน" },
];

const CRITERIA = [
  { pct: 40, label: "เนื้อหาถูกต้องและชัดเจน", desc: "อธิบายการใช้แอปพลิเคชันและแปลผลข้อมูลน้ำได้ถูกต้อง เข้าใจง่าย" },
  { pct: 30, label: "ความคิดสร้างสรรค์", desc: "เทคนิคการเล่าเรื่องน่าสนใจ ตัดต่อดี มีไอเดียแปลกใหม่ดึงดูดคนรุ่นใหม่" },
  { pct: 30, label: "ยอดการมีส่วนร่วม", desc: "วัดจากยอด View, Like, Share และ Comment ณ วันตัดรอบกิจกรรม" },
];

function ContestRulesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal">
              <Trophy className="h-4 w-4" /> #ThaiWaterChallenge
            </div>
            <h1 className="mt-3 font-heading text-4xl font-extrabold text-foreground">การประกวดสื่อ ThaiWater Challenge</h1>
            <p className="mt-2 text-muted-foreground">เปลี่ยนผู้ผ่านการอบรมให้เป็น Water Challenge ประจำภูมิภาค ส่งต่อความรู้ผ่านวิดีโอสั้น</p>
          </div>

          <Card className="mb-6 p-6">
            <h2 className="mb-4 font-heading text-2xl font-bold">กฎเกณฑ์และกติการ่วมกิจกรรม</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {RULES.map((r) => (
                <div key={r.title} className="flex gap-3 rounded-lg border bg-muted/30 p-4">
                  <r.icon className="h-6 w-6 flex-shrink-0 text-teal" />
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mb-8 p-6">
            <h2 className="mb-4 font-heading text-2xl font-bold">เกณฑ์การตัดสิน</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {CRITERIA.map((c) => (
                <div key={c.label} className="rounded-lg border bg-gradient-to-br from-navy/5 to-teal/10 p-5 text-center">
                  <div className="font-heading text-4xl font-extrabold text-teal">{c.pct}%</div>
                  <p className="mt-2 font-semibold">{c.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-teal/40 bg-gradient-to-br from-navy/5 to-teal/10 p-6">
            <h3 className="font-heading text-xl font-bold">เงื่อนไขผู้สมัคร</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              เปิดรับเฉพาะผู้ที่ผ่านการฝึกอบรมในโครงการแล้วเท่านั้น โดยจัดทีมร่วมกับสมาชิกที่ผ่านการอบรมจากสถาบันเดียวกัน
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/contest/register">
                <Button size="lg" className="bg-teal font-bold text-navy hover:bg-teal/90">
                  สมัครชิงรางวัล <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contest/submit">
                <Button size="lg" variant="outline">
                  <Upload className="h-4 w-4" /> ส่งผลงานของทีม
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
