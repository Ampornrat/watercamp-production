import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Shield, ShieldOff, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SurveyDashboard } from "@/components/SurveyDashboard";
import { SurveyBuilder } from "@/components/SurveyBuilder";
import { CustomSurveyDashboard } from "@/components/CustomSurveyDashboard";
import { sendTransactionalEmail } from "@/lib/email/send";
import { useAuth } from "@/hooks/useAuth";
import { assertAdmin } from "@/lib/admin-guard.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "ผู้ดูแลระบบ" }] }),
  beforeLoad: async () => {
    // Check session client-side first to avoid an unauthenticated server-fn call
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", replace: true });
    }
    try {
      await assertAdmin();
    } catch {
      throw redirect({ to: "/dashboard", replace: true });
    }
  },
  component: Admin,
});

type TrainingForm = {
  id?: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number;
  is_published: boolean;
  cover_image_url: string;
  attachment_1_url: string;
  attachment_1_name: string;
  attachment_2_url: string;
  attachment_2_name: string;
  attachment_3_url: string;
  attachment_3_name: string;
  course_type: "core" | "elective";
  prerequisite_training_id: string;
};

const empty: TrainingForm = {
  title: "", description: "", category: "", instructor: "", location: "",
  start_date: "", end_date: "", capacity: 30, is_published: true, cover_image_url: "",
  attachment_1_url: "", attachment_1_name: "",
  attachment_2_url: "", attachment_2_name: "",
  attachment_3_url: "", attachment_3_name: "",
  course_type: "elective",
  prerequisite_training_id: "",
};

const MAX_ATTACHMENT_BYTES = 500 * 1024 * 1024;

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TrainingForm>(empty);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
    else if (!loading && user && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [user, isAdmin, loading, navigate]);

  const trainings = useQuery({
    queryKey: ["admin-trainings"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("*");
      return profiles.map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
    },
  });

  const registrations = useQuery({
    queryKey: ["admin-registrations"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, trainings(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id).filter((id): id is string => !!id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email, organization").in("id", userIds)
        : { data: [] as Array<{ id: string; full_name: string; email: string | null; organization: string | null }> };
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((r) => ({ ...r, profile: r.user_id ? map.get(r.user_id) : null }));
    },
  });

  const saveTraining = useMutation({
    mutationFn: async (f: TrainingForm) => {
      const payload = {
        title: f.title, description: f.description, category: f.category || null,
        instructor: f.instructor || null, location: f.location || null,
        start_date: f.start_date, end_date: f.end_date,
        capacity: Number(f.capacity), is_published: f.is_published,
        cover_image_url: f.cover_image_url || null,
        attachment_1_url: f.attachment_1_url || null,
        attachment_1_name: f.attachment_1_name || null,
        attachment_2_url: f.attachment_2_url || null,
        attachment_2_name: f.attachment_2_name || null,
        attachment_3_url: f.attachment_3_url || null,
        attachment_3_name: f.attachment_3_name || null,
        course_type: f.course_type,
        prerequisite_training_id: f.course_type === "elective" && f.prerequisite_training_id ? f.prerequisite_training_id : null,
      };
      if (f.id) {
        const { error } = await supabase.from("trainings").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainings").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      setDialogOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["admin-trainings"] });
      qc.invalidateQueries({ queryKey: ["trainings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTraining = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("ลบแล้ว"); qc.invalidateQueries({ queryKey: ["admin-trainings"] }); },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("อัพเดทสิทธิ์แล้ว"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRegStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("registrations").update({ status }).eq("id", id);
      if (error) throw error;
      if (status === "confirmed") {
        // Look up registration details and send confirmation email
        const { data: r } = await supabase
          .from("registrations")
          .select("id, guest_name, guest_email, training_id, trainings:training_id(title, start_date, end_date, location), profile:profiles!registrations_user_id_fkey(full_name, email)")
          .eq("id", id)
          .maybeSingle();
        const rec: any = r;
        const recipientEmail = rec?.guest_email || rec?.profile?.email;
        const recipientName = rec?.guest_name || rec?.profile?.full_name;
        const fmt = (s?: string | null) =>
          s ? new Date(s).toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" }) : undefined;
        if (recipientEmail) {
          try {
            await sendTransactionalEmail({
              templateName: "registration-confirmation",
              recipientEmail,
              idempotencyKey: `registration-confirmed-${id}`,
              templateData: {
                name: recipientName || undefined,
                trainingTitle: rec?.trainings?.title,
                startDate: fmt(rec?.trainings?.start_date),
                endDate: fmt(rec?.trainings?.end_date),
                location: rec?.trainings?.location || undefined,
              },
            });
          } catch (e) {
            console.error("send confirmation email failed", e);
          }
        }
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "confirmed" ? "ยืนยันและส่งอีเมลแล้ว" : "อัพเดทแล้ว");
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCompletion = useMutation({
    mutationFn: async ({ id, completion_status }: { id: string; completion_status: "enrolled" | "completed" | "failed" }) => {
      const { error } = await supabase.from("registrations").update({ completion_status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("อัพเดทผลการเรียนแล้ว"); qc.invalidateQueries({ queryKey: ["admin-registrations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const activeSurveys = useQuery({
    queryKey: ["sb-surveys-active"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("surveys").select("id, title").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });

  const [sendDialog, setSendDialog] = useState<null | {
    id: string; email: string; name: string; training_id: string; training_title: string;
  }>(null);
  const [pickedSurvey, setPickedSurvey] = useState<string>("__default__");

  const sendSurvey = useMutation({
    mutationFn: async (args: { reg: NonNullable<typeof sendDialog>; surveyId: string }) => {
      const { reg, surveyId } = args;
      if (!reg.email) throw new Error("ไม่พบอีเมลของผู้เข้าฝึกอบรม");
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      let surveyUrl: string;
      if (surveyId === "__default__") {
        const { error } = await supabase.from("survey_responses").insert({
          training_id: reg.training_id, registration_id: reg.id, token,
          recipient_email: reg.email, recipient_name: reg.name,
        } as never);
        if (error) throw error;
        surveyUrl = `${window.location.origin}/survey/${token}`;
      } else {
        const { error } = await (supabase as any).from("survey_invitations").insert({
          survey_id: surveyId, training_id: reg.training_id, registration_id: reg.id,
          token, recipient_email: reg.email, recipient_name: reg.name,
        });
        if (error) throw error;
        surveyUrl = `${window.location.origin}/s/${token}`;
      }
      await sendTransactionalEmail({
        templateName: "survey-invitation",
        recipientEmail: reg.email,
        idempotencyKey: `survey-${reg.id}-${surveyId}-${Date.now()}`,
        templateData: { name: reg.name, trainingTitle: reg.training_title, surveyUrl },
      });
    },
    onSuccess: () => { toast.success("ส่งแบบสำรวจแล้ว"); setSendDialog(null); },
    onError: (e: Error) => toast.error(e.message),
  });


  if (!user || !isAdmin) return null;

  const coreTrainings = (trainings.data ?? []).filter((t) => t.course_type === "core");

  const openNew = () => { setForm(empty); setDialogOpen(true); };
  const openEdit = (t: { id: string; title: string; description: string; category: string | null; instructor: string | null; location: string | null; start_date: string; end_date: string; capacity: number; is_published: boolean; cover_image_url: string | null; attachment_1_url?: string | null; attachment_1_name?: string | null; attachment_2_url?: string | null; attachment_2_name?: string | null; attachment_3_url?: string | null; attachment_3_name?: string | null; course_type?: "core" | "elective" | null; prerequisite_training_id?: string | null }) => {
    setForm({
      id: t.id, title: t.title, description: t.description, category: t.category ?? "",
      instructor: t.instructor ?? "", location: t.location ?? "",
      start_date: t.start_date.slice(0, 16), end_date: t.end_date.slice(0, 16),
      capacity: t.capacity, is_published: t.is_published,
      cover_image_url: t.cover_image_url ?? "",
      attachment_1_url: t.attachment_1_url ?? "", attachment_1_name: t.attachment_1_name ?? "",
      attachment_2_url: t.attachment_2_url ?? "", attachment_2_name: t.attachment_2_name ?? "",
      attachment_3_url: t.attachment_3_url ?? "", attachment_3_name: t.attachment_3_name ?? "",
      course_type: (t.course_type ?? "elective") as "core" | "elective",
      prerequisite_training_id: t.prerequisite_training_id ?? "",
    });
    setDialogOpen(true);
  };


  const uploadAttachment = async (slot: 1 | 2 | 3, file: File) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`ไฟล์มีขนาดเกิน 500 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}-${slot}.${ext}`;
    const { error } = await supabase.storage.from("training-attachments").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("training-attachments").getPublicUrl(path);
    setForm((f) => ({
      ...f,
      [`attachment_${slot}_url`]: data.publicUrl,
      [`attachment_${slot}_name`]: file.name,
    }));
    toast.success(`อัปโหลดไฟล์ที่ ${slot} แล้ว`);
  };

  const clearAttachment = (slot: 1 | 2 | 3) => {
    setForm((f) => ({
      ...f,
      [`attachment_${slot}_url`]: "",
      [`attachment_${slot}_name`]: "",
    }));
  };


  const uploadCover = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("training-covers").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("training-covers").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
    toast.success("อัปโหลดรูปแล้ว");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">ระบบจัดการ</h1>
        <p className="mt-1 text-muted-foreground">จัดการหลักสูตร ผู้ใช้งาน และการลงทะเบียน</p>

        <Tabs defaultValue="trainings" className="mt-6">
          <TabsList>
            <TabsTrigger value="trainings">หลักสูตร</TabsTrigger>
            <TabsTrigger value="registrations">การลงทะเบียน</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้งาน</TabsTrigger>
            <TabsTrigger value="survey-builder">สร้างแบบสำรวจ</TabsTrigger>
            <TabsTrigger value="surveys">ผลสำรวจ (มาตรฐาน)</TabsTrigger>
            <TabsTrigger value="custom-surveys">ผลแบบสำรวจที่สร้าง</TabsTrigger>
          </TabsList>

          <TabsContent value="trainings" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Button onClick={openNew} className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" />เพิ่มหลักสูตร</Button>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ชื่อหลักสูตร</TableHead><TableHead>ประเภท</TableHead><TableHead>หมวด</TableHead>
                  <TableHead>วันที่</TableHead><TableHead>สถานะ</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {trainings.data?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>
                        {t.course_type === "core"
                          ? <Badge>หลักสูตรหลัก</Badge>
                          : <Badge variant="outline">เสริมทักษะ</Badge>}
                      </TableCell>
                      <TableCell>{t.category || "-"}</TableCell>
                      <TableCell className="text-sm">{new Date(t.start_date).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>{t.is_published ? <Badge>เผยแพร่</Badge> : <Badge variant="secondary">ซ่อน</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("ลบหลักสูตรนี้?")) deleteTraining.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="registrations" className="mt-4">
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ผู้ลงทะเบียน</TableHead><TableHead>หลักสูตร</TableHead>
                  <TableHead>หน่วยงาน</TableHead><TableHead>สถานะ</TableHead>
                  <TableHead>ผลการเรียน</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {registrations.data?.map((r) => {
                    const cs: string = (r as any).completion_status ?? "enrolled";
                    return (
                      <TableRow key={r.id}>
                        <TableCell><div className="font-medium">{r.profile?.full_name || r.guest_name || "-"}</div><div className="text-xs text-muted-foreground">{r.profile?.email || r.guest_email}{r.guest_phone ? ` · ${r.guest_phone}` : ""}</div></TableCell>
                        <TableCell>{r.trainings?.title}</TableCell>
                        <TableCell className="text-sm">{r.profile?.organization || r.guest_organization || "-"}</TableCell>
                        <TableCell><Badge variant={r.status === "confirmed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                        <TableCell>
                          <Select
                            value={cs}
                            onValueChange={(v) => updateCompletion.mutate({ id: r.id, completion_status: v as any })}
                          >
                            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enrolled">กำลังเรียน</SelectItem>
                              <SelectItem value="completed">ผ่าน</SelectItem>
                              <SelectItem value="failed">ไม่ผ่าน</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {r.status !== "confirmed" && <Button size="sm" variant="outline" onClick={() => updateRegStatus.mutate({ id: r.id, status: "confirmed" })}>ยืนยัน</Button>}
                          {r.status === "confirmed" && <Button size="sm" variant="ghost" onClick={() => updateRegStatus.mutate({ id: r.id, status: "pending" })}>ยกเลิกยืนยัน</Button>}
                          {cs === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPickedSurvey("__default__");
                                setSendDialog({
                                  id: r.id,
                                  email: (r.profile?.email || r.guest_email) ?? "",
                                  name: (r.profile?.full_name || r.guest_name) ?? "",
                                  training_id: r.training_id,
                                  training_title: r.trainings?.title ?? "",
                                });
                              }}
                            >
                              <Send className="mr-1 h-3 w-3" />ส่งแบบสำรวจ
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ชื่อ</TableHead><TableHead>อีเมล</TableHead>
                  <TableHead>หน่วยงาน</TableHead><TableHead>สิทธิ์</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {users.data?.map((u) => {
                    const isAdm = u.roles.includes("admin");
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || "-"}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="text-sm">{u.organization || "-"}</TableCell>
                        <TableCell>{isAdm ? <Badge>Admin</Badge> : <Badge variant="secondary">User</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !isAdm })}>
                            {isAdm ? <><ShieldOff className="mr-1 h-4 w-4" />ถอด Admin</> : <><Shield className="mr-1 h-4 w-4" />ตั้งเป็น Admin</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="survey-builder" className="mt-4">
            <SurveyBuilder />
          </TabsContent>

          <TabsContent value="surveys" className="mt-4">
            <SurveyDashboard />
          </TabsContent>

          <TabsContent value="custom-surveys" className="mt-4">
            <CustomSurveyDashboard />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!sendDialog} onOpenChange={(o) => !o && setSendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>เลือกแบบสำรวจที่จะส่ง</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              ส่งถึง: <span className="font-medium">{sendDialog?.name}</span> ({sendDialog?.email})
            </p>
            <Label>แบบสำรวจ</Label>
            <Select value={pickedSurvey} onValueChange={setPickedSurvey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">แบบสำรวจมาตรฐาน (8 ข้อ)</SelectItem>
                {activeSurveys.data?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(null)}>ยกเลิก</Button>
            <Button
              disabled={sendSurvey.isPending}
              onClick={() => sendDialog && sendSurvey.mutate({ reg: sendDialog, surveyId: pickedSurvey })}
              className="bg-gradient-primary"
            >
              <Send className="mr-1 h-3 w-3" />ส่ง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "แก้ไขหลักสูตร" : "เพิ่มหลักสูตร"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>ชื่อหลักสูตร *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>รายละเอียด</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Label>รูปประชาสัมพันธ์</Label>
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="cover" className="mt-2 mb-2 h-40 w-full rounded-md object-cover" />
              )}
              <div className="flex gap-2">
                <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
                {form.cover_image_url && (
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, cover_image_url: "" })}>ลบรูป</Button>
                )}
              </div>
            </div>
            <div><Label>หมวด</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>วิทยากร</Label><Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>สถานที่</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>วันเริ่ม *</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>วันสิ้นสุด *</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><Label>จำนวนรับ</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
            <div className="flex items-end gap-2"><input type="checkbox" id="pub" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /><Label htmlFor="pub">เผยแพร่</Label></div>
            <div className="md:col-span-2 space-y-3 rounded-md border p-3">
              <div>
                <Label>ประเภทหลักสูตร *</Label>
                <Select
                  value={form.course_type}
                  onValueChange={(v) => setForm({ ...form, course_type: v as "core" | "elective", prerequisite_training_id: v === "core" ? "" : form.prerequisite_training_id })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">หลักสูตรหลัก (ต้องผ่านก่อนเรียนหลักสูตรเสริม)</SelectItem>
                    <SelectItem value="elective">หลักสูตรเสริมทักษะ (ต้องผ่านหลักสูตรหลักก่อน)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.course_type === "elective" && (
                <div>
                  <Label>ต้องผ่านหลักสูตรหลัก (เลือกได้)</Label>
                  <Select
                    value={form.prerequisite_training_id || "__any__"}
                    onValueChange={(v) => setForm({ ...form, prerequisite_training_id: v === "__any__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหลักสูตรที่ต้องผ่านก่อน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">ผ่านหลักสูตรหลักใดก็ได้</SelectItem>
                      {coreTrainings.filter((c) => c.id !== form.id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {coreTrainings.filter((c) => c.id !== form.id).length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      ยังไม่มีหลักสูตรประเภท "หลักสูตรหลัก" ในระบบ — กรุณาสร้างหลักสูตรหลักก่อน หรือเลือก "ผ่านหลักสูตรหลักใดก็ได้"
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-3 rounded-md border p-3">
              <Label className="text-base">ไฟล์แนบข้อมูลที่เกี่ยวข้อง (สูงสุด 3 ไฟล์ ไฟล์ละไม่เกิน 500 MB)</Label>
              {([1, 2, 3] as const).map((slot) => {
                const url = form[`attachment_${slot}_url` as const];
                const name = form[`attachment_${slot}_name` as const];
                return (
                  <div key={slot} className="space-y-1">
                    <Label className="text-sm">ไฟล์ที่ {slot}</Label>
                    {url && (
                      <div className="text-xs">
                        <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                          {name || `ไฟล์ที่ ${slot}`}
                        </a>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadAttachment(slot, f);
                          e.target.value = "";
                        }}
                      />
                      {url && (
                        <Button type="button" variant="outline" size="sm" onClick={() => clearAttachment(slot)}>ลบ</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={() => saveTraining.mutate(form)} disabled={saveTraining.isPending} className="bg-gradient-primary">บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
