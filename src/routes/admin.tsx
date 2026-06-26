import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
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
import {
  getAdminTrainings,
  getAdminRegistrations,
  saveAdminTraining,
  deleteAdminTraining,
  updateAdminRegStatus,
  updateAdminCompletion,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "ผู้ดูแลระบบ" }] }),
  beforeLoad: async () => {
    const user = await getSession()
    if (!user || user.role !== 'admin') throw redirect({ to: '/login' })
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

function Admin() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TrainingForm>(empty);
  const [sendDialog, setSendDialog] = useState<null | { id: string; email: string; name: string; training_id: string; training_title: string }>(null);
  const [pickedSurvey, setPickedSurvey] = useState<string>("__default__");

  const getTrainingsFn = useServerFn(getAdminTrainings);
  const getRegsFn = useServerFn(getAdminRegistrations);
  const saveTrainingFn = useServerFn(saveAdminTraining);
  const deleteTrainingFn = useServerFn(deleteAdminTraining);
  const updateStatusFn = useServerFn(updateAdminRegStatus);
  const updateCompletionFn = useServerFn(updateAdminCompletion);

  const trainings = useQuery({ queryKey: ["admin-trainings"], queryFn: () => getTrainingsFn() });
  const registrations = useQuery({ queryKey: ["admin-registrations"], queryFn: () => getRegsFn() });

  const saveTraining = useMutation({
    mutationFn: (f: TrainingForm) => saveTrainingFn({ data: f }),
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
    mutationFn: (id: string) => deleteTrainingFn({ data: id }),
    onSuccess: () => { toast.success("ลบแล้ว"); qc.invalidateQueries({ queryKey: ["admin-trainings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRegStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStatusFn({ data: { id, status } }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "confirmed" ? "ยืนยันแล้ว" : "อัพเดทแล้ว");
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCompletion = useMutation({
    mutationFn: ({ id, completion_status }: { id: string; completion_status: string }) =>
      updateCompletionFn({ data: { id, completion_status } }),
    onSuccess: () => { toast.success("อัพเดทผลการเรียนแล้ว"); qc.invalidateQueries({ queryKey: ["admin-registrations"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const coreTrainings = (trainings.data ?? []).filter((t: any) => t.course_type === "core");

  const openNew = () => { setForm(empty); setDialogOpen(true); };
  const openEdit = (t: any) => {
    setForm({
      id: t.id, title: t.title, description: t.description ?? "", category: t.category ?? "",
      instructor: t.instructor ?? "", location: t.location ?? "",
      start_date: t.start_date ? t.start_date.slice(0, 16) : "",
      end_date: t.end_date ? t.end_date.slice(0, 16) : "",
      capacity: t.capacity, is_published: !!t.is_published,
      cover_image_url: t.cover_image_url ?? "",
      attachment_1_url: t.attachment_1_url ?? "", attachment_1_name: t.attachment_1_name ?? "",
      attachment_2_url: t.attachment_2_url ?? "", attachment_2_name: t.attachment_2_name ?? "",
      attachment_3_url: t.attachment_3_url ?? "", attachment_3_name: t.attachment_3_name ?? "",
      course_type: (t.course_type ?? "elective") as "core" | "elective",
      prerequisite_training_id: t.prerequisite_training_id ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">ระบบจัดการ</h1>
        <p className="mt-1 text-muted-foreground">จัดการหลักสูตร และการลงทะเบียน</p>

        <Tabs defaultValue="trainings" className="mt-6">
          <TabsList>
            <TabsTrigger value="trainings">หลักสูตร</TabsTrigger>
            <TabsTrigger value="registrations">การลงทะเบียน</TabsTrigger>
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
                  {(trainings.data ?? []).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>
                        {t.course_type === "core"
                          ? <Badge>หลักสูตรหลัก</Badge>
                          : <Badge variant="outline">เสริมทักษะ</Badge>}
                      </TableCell>
                      <TableCell>{t.category || "-"}</TableCell>
                      <TableCell className="text-sm">{t.start_date ? new Date(t.start_date).toLocaleDateString("th-TH") : "-"}</TableCell>
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
                  <TableHead>สถาบัน</TableHead><TableHead>สถานะ</TableHead>
                  <TableHead>ผลการเรียน</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(registrations.data ?? []).map((r: any) => {
                    const cs: string = r.completion_status ?? "enrolled";
                    return (
                      <TableRow key={r.id}>
                        <TableCell><div className="font-medium">{r.guest_name || "-"}</div><div className="text-xs text-muted-foreground">{r.guest_email}</div></TableCell>
                        <TableCell>{r.training_title || r.training_id}</TableCell>
                        <TableCell className="text-sm">{r.institute_name || r.institute_id || "-"}</TableCell>
                        <TableCell><Badge variant={r.approval_status === "approved" ? "default" : "secondary"}>{r.approval_status ?? "pending"}</Badge></TableCell>
                        <TableCell>
                          <Select
                            value={cs}
                            onValueChange={(v) => updateCompletion.mutate({ id: r.id, completion_status: v })}
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
                          {r.approval_status !== "approved" && (
                            <Button size="sm" variant="outline" onClick={() => updateRegStatus.mutate({ id: r.id, status: "approved" })}>ยืนยัน</Button>
                          )}
                          {r.approval_status === "approved" && (
                            <Button size="sm" variant="ghost" onClick={() => updateRegStatus.mutate({ id: r.id, status: "pending" })}>ยกเลิกยืนยัน</Button>
                          )}
                          {cs === "completed" && r.guest_email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPickedSurvey("__default__");
                                setSendDialog({
                                  id: r.id,
                                  email: r.guest_email ?? "",
                                  name: r.guest_name ?? "",
                                  training_id: r.training_id,
                                  training_title: r.training_title ?? "",
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
          <DialogHeader><DialogTitle>ส่งแบบสำรวจ</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              ส่งถึง: <span className="font-medium">{sendDialog?.name}</span> ({sendDialog?.email})
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(null)}>ยกเลิก</Button>
            <Button onClick={() => setSendDialog(null)} className="bg-gradient-primary">
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
            <div><Label>หมวด</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>วิทยากร</Label><Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>สถานที่</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>วันเริ่ม *</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>วันสิ้นสุด *</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><Label>จำนวนรับ</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
            <div className="flex items-end gap-2"><input type="checkbox" id="pub" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /><Label htmlFor="pub">เผยแพร่</Label></div>
            <div className="md:col-span-2">
              <Label>รูปหน้าปก (URL)</Label>
              <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="md:col-span-2 space-y-3 rounded-md border p-3">
              <div>
                <Label>ประเภทหลักสูตร *</Label>
                <Select
                  value={form.course_type}
                  onValueChange={(v) => setForm({ ...form, course_type: v as "core" | "elective", prerequisite_training_id: v === "core" ? "" : form.prerequisite_training_id })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">หลักสูตรหลัก</SelectItem>
                    <SelectItem value="elective">หลักสูตรเสริมทักษะ</SelectItem>
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
                    <SelectTrigger><SelectValue placeholder="เลือกหลักสูตรที่ต้องผ่านก่อน" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">ผ่านหลักสูตรหลักใดก็ได้</SelectItem>
                      {coreTrainings.filter((c: any) => c.id !== form.id).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
