import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GraduationCap } from "lucide-react";
import nsaLogo from "@/assets/aov-logo.png";
import unLogo from "@/assets/un-global-compact-transparent.png";
import dctLogo from "@/assets/dct-logo.png";
import hiiLogo from "@/assets/hii-logo-transparent.png";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "ภาคีความร่วมมือ | Thai Water Challenge" },
      { name: "description", content: "กรอบความร่วมมือการดำเนินการกิจกรรม \"สอนน้องรู้น้ำ\" และบทบาทหน้าที่ของหน่วยงานร่วม" },
      { property: "og:title", content: "ภาคีความร่วมมือ Thai Water Challenge" },
      { property: "og:description", content: "กรอบความร่วมมือการดำเนินกิจกรรม สอนน้องรู้น้ำ" },
    ],
  }),
  component: PartnersPage,
});

type Partner = {
  name: string;
  logo?: string;
  icon?: boolean;
  items: string[];
};

const partners: Partner[] = [
  {
    name: "กองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.)",
    logo: nsaLogo,
    items: [
      "ประชาสัมพันธ์สถานศึกษาเกี่ยวกับกิจกรรมสอนน้องรู้น้ำ",
      "ติดตามการเข้าร่วมกิจกรรมของนักศึกษา (ผู้กู้ยืม กยศ.)",
    ],
  },
  {
    name: "UN Global Compact Network Thailand (UNGCNT)",
    logo: unLogo,
    items: [
      "ประสานการดำเนินงานภาคีเครือข่าย / สถาบันการศึกษาที่มีความร่วมมือกับ UNGCNT",
      "เสริมทักษะด้านการพัฒนาเพื่อความยั่งยืน (Sustainability Development) ที่เป็นตัวชี้วัดระดับสถานศึกษา",
      "ติดตาม และรายงานการเข้าร่วมกิจกรรมตามกรอบตัวชี้วัด SDGs",
    ],
  },
  {
    name: "สภาดิจิทัลเพื่อเศรษฐกิจและสังคมแห่งประเทศไทย (DCT)",
    logo: dctLogo,
    items: [
      "ประสานการดำเนินงานภาคีเครือข่าย / สถาบันการศึกษาที่มีความร่วมมือกับ DCT",
      "พัฒนาระบบรับสมัครผู้เข้าร่วมกิจกรรมฯ โดยเชื่อมโยงกับระบบของ สสน. พร้อมคู่มือ",
      "รับสมัคร นักศึกษาเข้าร่วมกิจกรรมตามหลักเกณฑ์ที่กำหนด",
      "จัดทำรายงานผลการเข้าร่วมกิจกรรมส่งให้ กยศ. ตามเป้าหมายและเงื่อนไขที่กำหนด",
    ],
  },
  {
    name: "สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)",
    logo: hiiLogo,
    items: [
      "ประสานการดำเนินงานคัดเลือกสถาบันการศึกษาที่เข้าร่วมกิจกรรมฯ",
      "ให้ความรู้และทักษะด้านการจัดการน้ำ",
      "ติดตามรายงานผลการเข้าร่วมกิจกรรมของสถาบันการศึกษา และนักศึกษา",
    ],
  },
  {
    name: "สถาบันการศึกษา",
    icon: true,
    items: [
      "ประชาสัมพันธ์กิจกรรมที่เกี่ยวข้อง",
      "รับสมัคร และคัดเลือก นักศึกษาเข้าร่วมกิจกรรมตามหลักเกณฑ์ที่กำหนด",
      "ติดตามและประเมินผลการเข้าร่วมกิจกรรมของนักศึกษา",
    ],
  },
];

function PartnersPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, oklch(0.9 0.07 215), oklch(0.86 0.08 190))" }}
    >
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">PARTNERS</p>
          <h1 className="font-heading text-3xl font-bold text-navy md:text-4xl">
            กรอบความร่วมมือการดำเนินการกิจกรรม "สอนน้องรู้น้ำ"
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            บทบาทหน้าที่ของหน่วยงานร่วมที่ขับเคลื่อนกิจกรรม "สอนน้องรู้น้ำ"
            เพื่อพัฒนาการเรียนรู้และการจัดการทรัพยากรน้ำอย่างยั่งยืน
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((org) => (
            <div
              key={org.name}
              className="flex h-full flex-col rounded-xl border border-navy/15 p-5"
              style={{ backgroundColor: "oklch(0.94 0.045 205 / 0.78)" }}
            >
              <div className="mb-4 flex h-24 items-center justify-center rounded-md p-3">
                {org.logo ? (
                  <img src={org.logo} alt={org.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <GraduationCap className="h-12 w-12 text-teal" aria-hidden />
                )}
              </div>
              <p className="mb-3 font-heading font-semibold text-teal">{org.name}</p>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
                {org.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
