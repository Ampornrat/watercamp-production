import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/contest/submit")({
  component: ContestSubmitPage,
});

function ContestSubmitPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/contest" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับไปกติกา
          </Link>

          <Card className="p-10 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-green-700">Upload Story Board สำเร็จ</h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              รอการตรวจสอบจากกรรมการ และจะแจ้งผลการคัดเลือกให้ท่านทราบต่อไป
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
