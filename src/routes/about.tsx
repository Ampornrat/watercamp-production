import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "เกี่ยวกับโครงการ | Thai Water Challenge" },
      { name: "description", content: "รายละเอียดโครงการ Thai Water Challenge ความร่วมมือระหว่าง สสน., UNGCNT, DCT และ กยศ." },
      { property: "og:title", content: "เกี่ยวกับโครงการ Thai Water Challenge" },
      { property: "og:description", content: "โครงการอบรมและประกวดความรู้เรื่องน้ำสำหรับเยาวชน 4 ภูมิภาค" },
    ],
  }),
  component: AboutPage,
});

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="font-heading text-2xl font-bold text-navy">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function AboutPage() {
  const centralUnis = [
    "มหาวิทยาลัยสยาม",
    "มหาวิทยาลัยหอการค้าไทย",
    "มหาวิทยาลัยราชภัฏสวนสุนันทา",
    "มหาวิทยาลัยธรรมศาสตร์",
    "มหาวิทยาลัยเกษตรศาสตร์",
    "มหาวิทยาลัยมหิดล คณะสิ่งแวดล้อม (บึงบอระเพ็ด)",
    "มหาวิทยาลัยเกริก",
  ];
  const northUnis = ["มหาวิทยาลัยเชียงใหม่", "มหาวิทยาลัยแม่โจ้", "มหาวิทยาลัยพะเยา"];
  const northeastUnis = [
    "มหาวิทยาลัยขอนแก่น",
    "โรงเรียนมีชัยพัฒนา",
    "มหาวิทยาลัยราชภัฏอุดรธานี",
    "มหาวิทยาลัยราชภัฏบุรีรัมย์",
    "มหาวิทยาลัยมหาสารคาม",
  ];
  const southUnis = [
    "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตปัตตานี",
    "มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-10 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">เกี่ยวกับโครงการ</p>
          <h1 className="mt-2 font-heading text-4xl font-extrabold text-navy md:text-5xl">
            โครงการ Thai Water Challenge
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            ความร่วมมือระหว่าง <strong>สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)</strong>,{" "}
            <strong>สมาคมเครือข่ายโกลบอลคอมแพคแห่งประเทศไทย (UNGCNT)</strong>,{" "}
            <strong>สภาดิจิทัลเพื่อเศรษฐกิจและสังคมแห่งประเทศไทย (DCT)</strong> และ{" "}
            <strong>กองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.)</strong>
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <Card className="space-y-10 p-8">
            <Section title="1. หลักการและเหตุผล">
              <p>
                ประเทศไทยเผชิญปัญหาด้านน้ำอย่างต่อเนื่อง ทั้งน้ำท่วม ภัยแล้ง น้ำเสีย
                ซึ่งมีผลกระทบทำให้เกิดภัยพิบัติที่มีความรุนแรงมากขึ้นอย่างต่อเนื่อง
                อีกทั้งยังส่งผลต่อคุณภาพชีวิต เศรษฐกิจ และความมั่นคงของชุมชน การสร้างการเรียนรู้
                ความรู้ ความเข้าใจ และใช้ประโยชน์จากข้อมูลเกี่ยวกับน้ำ
                เพื่อการเตรียมการและติดตามสถานการณ์ที่เป็นปัจจัยสำคัญที่มีผลทำให้เกิดภัยพิบัติดังกล่าว
                เช่น ข้อมูลพายุ ปริมาณน้ำฝน น้ำในเขื่อน น้ำในแม่น้ำ ลำคลอง และน้ำบริเวณอ่าวไทยและอันดามัน
                ซึ่งสถาบันสารสนเทศน้ำ หรือ สสน. ได้จัดทำขึ้น
                จะเป็นประโยชน์ต่อการเฝ้าระวังและเตรียมความพร้อมรับสถานการณ์ได้อย่างถูกต้องและทันต่อเหตุการณ์
              </p>
              <p>
                การมีส่วนร่วมของเด็กและเยาวชนเป็นกลไกที่สำคัญในการพัฒนาความตระหนักรู้
                และการเสริมสร้างศักยภาพของสังคมในการรับมือกับภัยพิบัติด้านน้ำอย่างยั่งยืน
                โดยการพัฒนาเด็กและเยาวชนให้เป็น “Water Challenge” ประจำภูมิภาค
                มีกระบวนการเรียนรู้เชิงปฏิบัติผ่านสถานการณ์จริง การเฝ้าระวังสถานการณ์น้ำ
                การใช้เทคโนโลยีและข้อมูลในพื้นที่ การทดลองแก้ปัญหาในระดับพื้นที่โดยการทำงานเป็นทีม
                ตลอดจนการมีส่วนร่วมของสถาบันการศึกษา ชุมชน และหน่วยงานที่เกี่ยวข้อง
                เพื่อสร้างเครือข่ายเยาวชนที่มีศักยภาพในการสื่อสารและขับเคลื่อนการจัดการน้ำในระดับพื้นที่ได้อย่างชาญฉลาดและยั่งยืน
              </p>
            </Section>

            <Section title="2. วัตถุประสงค์">
              <ol className="list-decimal space-y-2 pl-6">
                <li>เพื่อเผยแพร่และแลกเปลี่ยนความรู้ด้านข้อมูลน้ำของประเทศสู่ภาคการศึกษา</li>
                <li>เพื่อแนะนำเทคโนโลยีและเครื่องมือต่าง ๆ สำหรับประยุกต์ใช้ข้อมูลน้ำด้านการวิเคราะห์วิจัย</li>
                <li>
                  เพื่อให้เยาวชนสามารถติดตามและวิเคราะห์สถานการณ์น้ำได้ด้วยตนเอง
                  รวมถึงสามารถถ่ายทอดความรู้ด้านน้ำได้อย่างถูกต้องเหมาะสม
                </li>
                <li>เพื่อสร้างการมีส่วนร่วมของเยาวชนและเครือข่ายเยาวชนในการจัดการทรัพยากรน้ำในระดับชุมชน</li>
              </ol>
            </Section>

            <Section title="3. เป้าหมาย">
              <ul className="list-disc space-y-2 pl-6">
                <li>นักศึกษาระดับอุดมศึกษา จำนวน 50 – 100 คน ต่อภาค (ภาคเหนือ ใต้ กลาง และอีสาน)</li>
                <li>สถาบันการศึกษาในพื้นที่ภูมิภาคต่าง ๆ</li>
                <li>ครู/อาจารย์ช่วยแนะนำให้คำปรึกษานักศึกษาในสถาบันการศึกษาเป้าหมาย แห่งละอย่างน้อย 1 คน</li>
              </ul>
            </Section>

            <Section title="4. ระยะเวลาดำเนินงาน">
              <p>ระยะเวลา 6 เดือน (มิถุนายน 2569 ถึง พฤศจิกายน 2569)</p>
            </Section>

            <Section title="5. ขั้นตอนและแผนการดำเนินงาน">
              <ol className="list-decimal space-y-2 pl-6">
                <li>
                  คัดเลือกสถานศึกษาเข้าร่วมโครงการ
                  โดยทำหนังสือเชิญชวนสถาบันการศึกษาเป้าหมายในแต่ละภูมิภาคอย่างน้อยภาคละ 5 สถานศึกษา
                </li>
                <li>
                  คัดเลือกเยาวชนเข้าร่วมโครงการ
                  โดยประสานงานผ่านสถาบันการศึกษาที่เข้าร่วมโครงการในการเชิญชวนเยาวชนสมัครผ่านช่องทางของโครงการ
                  ทีมละ 5 คน
                </li>
                <li>
                  แนะนำ Application “ThaiWaterChallenge”
                  และคู่มือการใช้งานพร้อมการติดตั้งใช้งานบนอุปกรณ์เคลื่อนที่ของเยาวชน
                </li>
                <li>อบรมให้ความรู้เกี่ยวกับข้อมูลน้ำ การใช้ประโยชน์ และวิเคราะห์ข้อมูลกรณีตัวอย่างในระดับภาค</li>
                <li>
                  เยาวชนติดตามสถานการณ์น้ำในพื้นที่ และนำเสนอผลการติดตามสถานการณ์ผ่านคลิปวิดีโอ 1-3 นาที
                  ในหัวข้อเกี่ยวกับสถานการณ์น้ำ ระหว่างและหลังเข้ารับการอบรม
                  โดยใช้ข้อมูลจากเว็บไซต์ www.thaiwater.net และแอปพลิเคชัน “ThaiWater Mobile Application”
                </li>
                <li>ประกวดชิงรางวัล โดยมีกฎเกณฑ์และกติกาในการเข้าร่วมกิจกรรมตามที่กำหนด</li>
              </ol>
            </Section>

            <Section title="6. ช่องทางการดำเนินกิจกรรม">
              <ul className="list-disc space-y-2 pl-6">
                <li>เว็บไซต์และแอปพลิเคชัน ThaiWater</li>
                <li>สถาบันการศึกษาที่เข้าร่วมโครงการใน 4 ภูมิภาค</li>
                <li>เครือข่ายสังคมออนไลน์โครงการ และ Zoom</li>
              </ul>
            </Section>

            <Section title="7. ผู้เข้าร่วมโครงการ">
              <p className="font-semibold">7.1 สถาบันการศึกษาเป้าหมายใน 4 ภูมิภาค</p>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { name: "ภาคกลาง", items: centralUnis },
                  { name: "ภาคเหนือ", items: northUnis },
                  { name: "ภาคตะวันออกเฉียงเหนือ", items: northeastUnis },
                  { name: "ภาคใต้", items: southUnis },
                ].map((r) => (
                  <div key={r.name} className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-2 font-semibold text-teal">{r.name}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {r.items.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-semibold">7.2 เยาวชนที่เข้าร่วมโครงการ</p>
              <p className="font-medium">คุณสมบัติของเยาวชน</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>เป็นนักศึกษาในสถาบันการศึกษาที่เข้าร่วมโครงการ</li>
                <li>มีอุปกรณ์เคลื่อนที่ประจำตัวที่สามารถ download Mobile Application “ThaiWaterChallenge” ได้</li>
              </ul>
              <p className="font-medium">การเตรียมตัวก่อนเข้ารับการอบรม</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>เตรียมอุปกรณ์เคลื่อนที่ (Mobile Devices) เพื่อใช้ติดตั้ง “ThaiWater Mobile Application”</li>
              </ul>
            </Section>

            <Section title="8. กำหนดการ">
              <ul className="space-y-2">
                <li><strong>เดือนที่ 1 (มิ.ย. 2569):</strong> การคัดเลือกและลงทะเบียนเยาวชน</li>
                <li><strong>เดือนที่ 2 (ก.ค. 2569):</strong> ฝึกอบรมเกี่ยวกับข้อมูลน้ำ และอบรมเสริมทักษะ STEM (เฉพาะผู้สนใจ)</li>
                <li><strong>เดือนที่ 3 – 5:</strong> ติดตามสถานการณ์น้ำและจัดทำคลิปวิดีโอ</li>
                <li><strong>เดือนที่ 6:</strong> สรุปและประกาศผลกิจกรรม พร้อมแจกรางวัล</li>
              </ul>
            </Section>

            <Section title="9. ผลที่คาดว่าจะได้รับ">
              <ul className="list-disc space-y-2 pl-6">
                <li>เยาวชนได้รับความรู้ด้านข้อมูลน้ำของประเทศ และสามารถนำไปประยุกต์ใช้ได้</li>
                <li>เกิดเครือข่ายเยาวชนด้านการจัดการทรัพยากรน้ำในระดับชุมชนและภูมิภาค</li>
                <li>
                  เยาวชนมีความรู้เกี่ยวกับและการใช้ประโยชน์จากฐานข้อมูลแหล่งน้ำ
                  สามารถถ่ายทอดต่อไปยังครอบครัว สถาบันการศึกษา และชุมชน
                  ส่งผลให้สังคมอยู่กับน้ำได้ในระยะยาว
                </li>
                <li>
                  สถาบันการศึกษาสามารถหนุนเสริมเป้าหมายการพัฒนาด้านความยั่งยืน (SDG)
                  ของสถาบันผ่านกิจกรรม Thai Water Challenge
                </li>
              </ul>
            </Section>
          </Card>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-teal/30 bg-teal/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal">หน่วยงานร่วมจัด</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>• สถาบันสารสนเทศทรัพยากรน้ำ (สสน.)</li>
                <li>• UN Global Compact Network Thailand</li>
                <li>• สภาดิจิทัลเพื่อเศรษฐกิจและสังคมแห่งประเทศไทย (DCT)</li>
                <li>• กองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.)</li>
              </ul>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">แฮชแท็ก</p>
              <p className="mt-2 font-heading text-xl font-bold text-navy">#ThaiWaterChallenge</p>
              <p className="mt-1 text-xs text-muted-foreground">สำหรับสร้าง Brand Awareness</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ระยะเวลา</p>
              <p className="mt-2 font-semibold text-navy">มิ.ย. – พ.ย. 2569</p>
              <p className="text-sm text-muted-foreground">รวม 6 เดือน</p>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
