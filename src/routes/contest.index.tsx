import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/contest/")({
  component: ContestPage,
});

const PRELIM_CRITERIA = [
  { pct: 35, title: "STEM (35 คะแนน)", desc: "ประยุกต์ใช้ STEM ในการคิด วิเคราะห์ และวางแผนอย่างเป็นระบบเพื่อความยั่งยืน" },
  { pct: 30, title: "เนื้อหา (30 คะแนน)", desc: "ถูกต้อง ชัดเจน อธิบายการใช้แอฟพลิเคชัน และแปลผลข้อมูลน้ำถูกต้อง เข้าใจง่าย" },
  { pct: 35, title: "สร้างสรรค์ (35 คะแนน)", desc: "เทคนิค การเล่าเรื่องน่าสนใจ ตัดต่อดี มีไอเดียแปลกใหม่ ความยาวไม่เกิน 3 นาที" },
];

const FINAL_CRITERIA = [
  { pct: 30, title: "STEM (30 คะแนน)", desc: "ประยุกต์ใช้ STEM ในการคิด วิเคราะห์ และวางแผนอย่างเป็นระบบเพื่อความยั่งยืน" },
  { pct: 30, title: "เนื้อหา (30 คะแนน)", desc: "ถูกต้อง ชัดเจน อธิบายการใช้แอฟพลิเคชัน และแปลผลข้อมูลน้ำถูกต้อง เข้าใจง่าย" },
  { pct: 30, title: "สร้างสรรค์ (30 คะแนน)", desc: "เทคนิค การเล่าเรื่องน่าสนใจ ตัดต่อดี มีไอเดียแปลกใหม่ ความยาวไม่เกิน 3 นาที" },
  { pct: 10, title: "ยอดการมีส่วนร่วม (10 คะแนน)", desc: "วัดจากยอด View/ Like/ Share และ Comment ณ วันตัดสินรอบกิจกรรม" },
];

const HASHTAGS = ["#Thaiwater", "#วัยรุ่นรู้ทันน้ำ", "#thaiwaterambassador", "#สสน"];

const LOGOS_ROW1 = [
  { src: "/images/logo_mhesi.png", alt: "กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม", h: 44 },
  { src: "/images/logo_ssn.jpg", alt: "สสน", h: 44 },
  { src: "/images/logo_ungc.png", alt: "UN Global Compact Network Thailand", h: 40 },
  { src: "/images/logo_dct.png", alt: "DCT", h: 40 },
  { src: "/images/logo_kyf.webp", alt: "กองทุนเงินให้กู้ยืมเพื่อการศึกษา", h: 44 },
];

const LOGOS_ROW2 = [
  { src: "/images/logo_true.png", alt: "True", h: 32 },
  { src: "/images/logo_thaibev.png", alt: "ThaiBev", h: 32 },
  { src: "/images/logo_kabinburi.png", alt: "Kabinburi Industrial Zone", h: 32 },
  { src: "/images/logo_tcp.png", alt: "TCP", h: 32 },
  { src: "/images/logo_scgc.png", alt: "SCGC", h: 32 },
  { src: "/images/logo_aiat.png", alt: "AIAT", h: 32 },
  { src: "/images/logo_mk.png", alt: "MK Restaurants", h: 32 },
];

function ScoreRing({ pct }: { pct: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full"
      style={{
        width: 52,
        height: 52,
        background: `conic-gradient(#0f7fa3 ${pct}%, #dcedf3 0)`,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full bg-white font-heading font-bold"
        style={{ width: "70%", height: "70%", fontSize: 11, color: "#0b3d63" }}
      >
        {pct}%
      </span>
    </div>
  );
}

function SectionPill({ label }: { label: string }) {
  return (
    <span
      className="mb-5 inline-block rounded-full font-heading font-semibold text-white"
      style={{ background: "#0f7fa3", padding: "9px 22px", fontSize: 16 }}
    >
      {label}
    </span>
  );
}

function ContestPage() {
  return (
    <div className="min-h-screen" style={{ background: "#f4f9fb", fontFamily: "'Noto Sans Thai', sans-serif", color: "#123047" }}>
      <SiteHeader />

      <div className="mx-auto" style={{ maxWidth: 1200 }}>

        {/* HERO */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg,#0b3d63 0%,#0e4d78 100%)",
            padding: "28px 32px 0",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 85% 10%,rgba(255,255,255,0.06),transparent 55%)" }}
          />

          {/* Logo card */}
          <div
            className="relative flex flex-col items-center gap-2.5 rounded-2xl bg-white"
            style={{ padding: "14px 20px" }}
          >
            <div className="flex flex-wrap items-center justify-center gap-7">
              {LOGOS_ROW1.map((l) => (
                <img key={l.alt} src={l.src} alt={l.alt} style={{ height: l.h, width: "auto" }} />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5">
              {LOGOS_ROW2.map((l) => (
                <img key={l.alt} src={l.src} alt={l.alt} style={{ height: l.h, width: "auto" }} />
              ))}
            </div>
          </div>

          {/* Hero content */}
          <div
            className="relative grid items-center gap-6"
            style={{ gridTemplateColumns: "1.15fr 0.85fr", padding: "36px 8px 0" }}
          >
            <div>
              <h1 className="font-heading" style={{ margin: "0 0 6px", fontSize: 40, lineHeight: 1.25, color: "#fff", fontWeight: 700 }}>
                ประกวดสื่อสร้างสรรค์
              </h1>
              <h1 className="font-heading" style={{ margin: "0 0 6px", fontSize: 40, lineHeight: 1.2, color: "#7fd9ef", fontWeight: 800, letterSpacing: "0.5px" }}>
                THAIWATER CHALLENGE
              </h1>
              <h2 className="font-heading" style={{ margin: "0 0 22px", fontSize: 24, lineHeight: 1.3, color: "#eaf6fb", fontWeight: 600 }}>
                สำหรับนักเรียน นักศึกษา
              </h2>
              <div className="mb-6 flex flex-wrap gap-3">
                <span className="font-heading font-semibold" style={{ background: "#0a2d4d", color: "#fff", padding: "10px 22px", borderRadius: 999, fontSize: 16, border: "1px solid rgba(255,255,255,0.25)" }}>
                  Water Challenge ประจำภูมิภาค
                </span>
                <span className="font-heading font-semibold" style={{ background: "#0a2d4d", color: "#fff", padding: "10px 22px", borderRadius: 999, fontSize: 16, border: "1px solid rgba(255,255,255,0.25)" }}>
                  Edutainment
                </span>
              </div>
              <div className="flex flex-wrap gap-3.5">
                <Link
                  to="/student/login"
                  className="font-heading font-bold"
                  style={{ background: "#ffb703", color: "#12314f", padding: "14px 28px", borderRadius: 10, fontSize: 17, textDecoration: "none", display: "inline-block" }}
                >
                  สมัครเข้าร่วมประกวด
                </Link>
                <a
                  href="#judging"
                  className="font-heading font-semibold"
                  style={{ background: "transparent", color: "#fff", padding: "14px 28px", borderRadius: 10, fontSize: 17, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.5)", display: "inline-block" }}
                >
                  ดูเกณฑ์การตัดสิน
                </a>
              </div>
            </div>
            <img src="/images/students_hero.png" alt="นักเรียนนักศึกษา" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </section>

        {/* FORMAT + APPROACH */}
        <section style={{ padding: "56px 32px 20px" }}>
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ background: "#fff", border: "1.5px solid #b9e2ee", borderRadius: 16, padding: 28 }}>
              <SectionPill label="รูปแบบวิดีโอ" />
              <div className="flex items-center" style={{ gap: 18 }}>
                <div className="flex" style={{ gap: 10 }}>
                  {/* TikTok */}
                  <div className="flex items-center justify-center rounded-xl" style={{ width: 48, height: 48, background: "#000" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                      <path d="M16.5 3c.4 2.3 1.9 3.9 4.5 4.1v3.1c-1.6 0-3-.5-4.3-1.4v6.6c0 3.4-2.2 6-5.7 6-3.3 0-5.9-2.7-5.9-6 0-3.4 2.9-6.1 6.4-5.9v3.2c-.3-.1-.6-.1-1-.1-1.5 0-2.7 1.2-2.7 2.7 0 1.6 1.2 2.8 2.7 2.8 1.6 0 3-1.2 3-2.9V3h3z" />
                    </svg>
                  </div>
                  {/* YouTube */}
                  <div className="flex items-center justify-center rounded-xl" style={{ width: 48, height: 48, background: "#ff0000" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  {/* Instagram */}
                  <div className="flex items-center justify-center rounded-xl" style={{ width: 48, height: 48, background: "linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" stroke="none" />
                    </svg>
                  </div>
                </div>
                <p className="font-heading font-semibold" style={{ margin: 0, fontSize: 20, color: "#0b3d63" }}>
                  วิดีโอสั้น (1-3 นาที)
                </p>
              </div>
            </div>

            <div style={{ background: "#fff", border: "1.5px solid #b9e2ee", borderRadius: 16, padding: 28 }}>
              <SectionPill label="แนวทาง" />
              <div className="flex items-center" style={{ gap: 18 }}>
                <img src="/images/edutainment_icons.png" alt="ไอคอนแนวทาง Edutainment" style={{ height: 56, width: "auto", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "#274a63" }}>
                  แนวทาง <strong>"Edutainment"</strong> (สนุกและได้ความรู้) เช่น คลิป POV หรือรีวิวแอพ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* APP SHOWCASE */}
        <section style={{ padding: "20px 32px" }}>
          <div style={{ background: "#fff", border: "1.5px solid #b9e2ee", borderRadius: 16, padding: 28, textAlign: "center" }}>
            <SectionPill label="เนื้อหา" />
            <img
              src="/images/app_screens.png"
              alt="ตัวอย่างฟังก์ชันแอปพลิเคชัน ThaiWater"
              style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto 18px" }}
            />
            <p className="font-heading font-semibold" style={{ margin: 0, fontSize: 17, color: "#0b3d63", lineHeight: 1.6 }}>
              สาธิตฟังก์ชันการทำงานแอพพลิเคชัน ThaiWater:<br />
              เช่น ดูเรดาร์ ดูระดับน้ำ ติดตามสถานการณ์น้ำ
            </p>
          </div>
        </section>

        {/* POSTING */}
        <section style={{ padding: "20px 32px" }}>
          <div style={{ background: "#fff", border: "1.5px solid #b9e2ee", borderRadius: 16, padding: 28 }}>
            <SectionPill label="การโพสต์" />
            <p style={{ margin: "0 0 16px", fontSize: 16, lineHeight: 1.7, color: "#274a63" }}>
              ตั้งค่าสาธารณะ, ติดแฮชแท็ก:
            </p>
            <div className="flex flex-wrap gap-2.5">
              {HASHTAGS.map((tag) => (
                <span
                  key={tag}
                  className="font-heading font-semibold"
                  style={{ background: "#e6f5fa", color: "#0f7fa3", padding: "8px 16px", borderRadius: 999, fontSize: 15 }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* JUDGING CRITERIA */}
        <section id="judging" style={{ padding: "36px 32px 20px" }}>
          <h2 className="font-heading" style={{ textAlign: "center", fontSize: 26, color: "#0b3d63", margin: "0 0 26px" }}>
            เกณฑ์การตัดสิน
          </h2>
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>

            {/* Prelim */}
            <div style={{ background: "#fff", border: "1.5px solid #b9e2ee", borderRadius: 16, padding: 26 }}>
              <SectionPill label="เกณฑ์การตัดสินรอบคัดเลือก" />
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p style={{ margin: 0, fontSize: 14, color: "#5a7c92", fontWeight: 600 }}>
                  รอบคัดเลือกส่งผลงานในรูปแบบ Story Board
                </p>
                <a
                  href="https://drive.google.com/drive/folders/1g9fMy-6mH0QWzdXHvD8QZRge0es5bv3X"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-heading font-semibold"
                  style={{ background: "#ffb703", color: "#12314f", padding: "8px 16px", borderRadius: 999, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(255,183,3,0.45)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  ดาวน์โหลด Template Story Board
                </a>
                <a
                  href="https://drive.google.com/drive/folders/1g9fMy-6mH0QWzdXHvD8QZRge0es5bv3X"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-heading font-semibold"
                  style={{ background: "#0f7fa3", color: "#fff", padding: "8px 16px", borderRadius: 999, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(15,127,163,0.35)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  คู่มือการสมัครเข้าประกวด
                </a>
              </div>
              {PRELIM_CRITERIA.map((c) => (
                <div
                  key={c.title}
                  className="flex items-center gap-4"
                  style={{ padding: "12px 0", borderTop: "1px solid #eaf3f7" }}
                >
                  <ScoreRing pct={c.pct} />
                  <div>
                    <p className="font-heading font-semibold" style={{ margin: "0 0 4px", fontSize: 16, color: "#0b3d63" }}>{c.title}</p>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#5a7c92" }}>{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Final */}
            <div style={{ background: "#fff", border: "1.5px solid #b9e2ee", borderRadius: 16, padding: 26 }}>
              <SectionPill label="เกณฑ์การตัดสินรอบตัดสิน" />
              <p style={{ margin: "0 0 18px", fontSize: 14, color: "#5a7c92", fontWeight: 600 }}>
                ส่ง Clip VDO บน YouTube / TikTok / Instagram
              </p>
              {FINAL_CRITERIA.map((c) => (
                <div
                  key={c.title}
                  className="flex items-center gap-4"
                  style={{ padding: "12px 0", borderTop: "1px solid #eaf3f7" }}
                >
                  <ScoreRing pct={c.pct} />
                  <div>
                    <p className="font-heading font-semibold" style={{ margin: "0 0 4px", fontSize: 16, color: "#0b3d63" }}>{c.title}</p>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#5a7c92" }}>{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* CONDITIONS + SUBMISSION */}
        <section style={{ padding: "20px 32px 56px" }}>
          <div style={{ background: "linear-gradient(180deg,#0b3d63,#0e4d78)", borderRadius: 20, padding: 36 }}>
            <h3 className="font-heading font-bold" style={{ margin: "0 0 14px", fontSize: 22, color: "#fff" }}>
              เงื่อนไข
            </h3>
            <p style={{ margin: "0 0 22px", fontSize: 16, lineHeight: 1.8, color: "#dfeef5" }}>
              เข้าร่วมเป็นทีมอย่างน้อย 5 คนขึ้นไป โดยสามารถเรียนวิธีการทำสื่อผ่าน Zoom วันที่ 7 ก.ย. 69
            </p>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 22px", marginBottom: 22 }}>
              <p className="font-heading font-semibold" style={{ margin: "0 0 4px", fontSize: 17, color: "#7fd9ef" }}>
                เริ่มส่งผลงานตั้งแต่วันที่ 1-30 กันยายน 69 ได้ที่
              </p>
              <Link
                to="/student/login"
                style={{ color: "#fff", fontSize: 15, textDecoration: "underline" }}
              >
                watercamp.kwunjai.com/contest/submit
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <img src="/images/download_thaiwater.png" alt="Download ThaiWater" style={{ height: 52, width: "auto" }} />
              <img src="/images/badge_googleplay.png" alt="Get it on Google Play" style={{ height: 42, width: "auto" }} />
              <img src="/images/badge_appstore.png" alt="Download on the App Store" style={{ height: 42, width: "auto" }} />
            </div>
          </div>
        </section>

      </div>

      <SiteFooter />
    </div>
  );
}
