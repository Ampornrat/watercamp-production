import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Droplets } from "lucide-react";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({ meta: [{ title: "ยกเลิกการรับอีเมล | คลังข้อมูลน้ำแห่งชาติ" }] }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error" | "submitting">("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) {
      setState("invalid");
      return;
    }
    setToken(t);
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          setErrMsg(data?.error || "ลิงก์ไม่ถูกต้อง");
          return;
        }
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) setState("done");
      else if (data.reason === "already_unsubscribed") setState("already");
      else {
        setState("error");
        setErrMsg(data?.error || "ไม่สามารถดำเนินการได้");
      }
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Droplets className="h-5 w-5" />
          </div>
          <span className="font-bold">คลังข้อมูลน้ำแห่งชาติ</span>
        </Link>

        {state === "loading" && <p className="text-muted-foreground">กำลังตรวจสอบลิงก์...</p>}

        {state === "valid" && (
          <>
            <h1 className="mb-2 text-xl font-bold">ยืนยันการยกเลิกรับอีเมล</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              คลิกปุ่มด้านล่างเพื่อหยุดรับอีเมลแจ้งเตือนจากเรา
            </p>
            <Button className="w-full" onClick={confirm}>ยืนยันยกเลิกการรับอีเมล</Button>
          </>
        )}

        {state === "submitting" && <p className="text-muted-foreground">กำลังดำเนินการ...</p>}

        {state === "done" && (
          <>
            <h1 className="mb-2 text-xl font-bold">ยกเลิกเรียบร้อยแล้ว</h1>
            <p className="text-sm text-muted-foreground">คุณจะไม่ได้รับอีเมลจากเราอีก</p>
          </>
        )}

        {state === "already" && (
          <>
            <h1 className="mb-2 text-xl font-bold">ยกเลิกไปแล้ว</h1>
            <p className="text-sm text-muted-foreground">อีเมลของคุณถูกยกเลิกการรับไปก่อนหน้านี้แล้ว</p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="mb-2 text-xl font-bold">ลิงก์ไม่ถูกต้อง</h1>
            <p className="text-sm text-muted-foreground">{errMsg || "ลิงก์อาจหมดอายุหรือไม่ถูกต้อง"}</p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="mb-2 text-xl font-bold">เกิดข้อผิดพลาด</h1>
            <p className="text-sm text-muted-foreground">{errMsg || "กรุณาลองใหม่ภายหลัง"}</p>
          </>
        )}
      </Card>
    </div>
  );
}
