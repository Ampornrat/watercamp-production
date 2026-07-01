import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Pencil, Trash2, Send, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
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
  getAdminUsers,
  saveAdminTraining,
  deleteAdminTraining,
  updateAdminRegStatus,
  updateAdminCompletion,
  getAdminInstitutes,
  updateInstituteRegion,
} from "@/lib/admin.functions";
import { getSessionsForTraining, saveAdminSession, deleteAdminSession, REGIONS } from "@/lib/training-sessions.functions";

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
  online_url: string;
  attachment_1_url: string;
  attachment_1_name: string;
  attachment_2_url: string;
  attachment_2_name: string;
  attachment_3_url: string;
  attachment_3_name: string;
  course_type: "core" | "elective";
  prerequisite_training_id: string;
  required_for_contest: boolean;
};

const empty: TrainingForm = {
  title: "", description: "", category: "", instructor: "", location: "",
  start_date: "", end_date: "", capacity: 30, is_published: true, cover_image_url: "", online_url: "",
  attachment_1_url: "", attachment_1_name: "",
  attachment_2_url: "", attachment_2_name: "",
  attachment_3_url: "", attachment_3_name: "",
  course_type: "elective",
  prerequisite_training_id: "",
  required_for_contest: false,
};

function Admin() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TrainingForm>(empty);
  const [sendDialog, setSendDialog] = useState<null | { id: string; email: string; name: string; training_id: string; training_title: string }>(null);
  const [pickedSurvey, setPickedSurvey] = useState<string>("__default__");
  const [regSort, setRegSort] = useState<{ col: 'guest_name' | 'training_title' | 'institute_name'; dir: 'asc' | 'desc' } | null>(null);

  const emptySessionForm = { region: '' as typeof REGIONS[number], start_datetime: '', end_datetime: '', location: '', online_url: '', capacity: 30 };
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);

  const getTrainingsFn = useServerFn(getAdminTrainings);
  const getRegsFn = useServerFn(getAdminRegistrations);
  const getUsersFn = useServerFn(getAdminUsers);
  const saveTrainingFn = useServerFn(saveAdminTraining);
  const deleteTrainingFn = useServerFn(deleteAdminTraining);
  const updateStatusFn = useServerFn(updateAdminRegStatus);
  const updateCompletionFn = useServerFn(updateAdminCompletion);
  const getSessionsFn = useServerFn(getSessionsForTraining);
  const saveSessionFn = useServerFn(saveAdminSession);
  const deleteSessionFn = useServerFn(deleteAdminSession);
  const getInstitutesFn = useServerFn(getAdminInstitutes);
  const updateInstituteRegionFn = useServerFn(updateInstituteRegion);

  const trainings = useQuery({ queryKey: ["admin-trainings"], queryFn: () => getTrainingsFn() });
  const registrations = useQuery({ queryKey: ["admin-registrations"], queryFn: () => getRegsFn() });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => getUsersFn() });
  const institutes = useQuery({ queryKey: ["admin-institutes"], queryFn: () => getInstitutesFn() });
  const sessions = useQuery({
    queryKey: ["admin-sessions", form.id],
    queryFn: () => getSessionsFn({ data: { training_id: form.id! } }),
    enabled: !!form.id && dialogOpen,
  });

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

  const saveSession = useMutation({
    mutationFn: (s: typeof sessionForm & { id?: string }) =>
      saveSessionFn({ data: { ...s, training_id: form.id!, region: s.region as typeof REGIONS[number], capacity: Number(s.capacity) } }),
    onSuccess: () => {
      toast.success("บันทึกรอบการสอนแล้ว");
      setShowSessionForm(false);
      setEditingSessionId(null);
      setSessionForm(emptySessionForm);
      qc.invalidateQueries({ queryKey: ["admin-sessions", form.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => deleteSessionFn({ data: { id } }),
    onSuccess: () => { toast.success("ลบรอบแล้ว"); qc.invalidateQueries({ queryKey: ["admin-sessions", form.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const coreTrainings = (trainings.data ?? []).filter((t: any) => t.course_type === "core");

  const exportRegistrationsCSV = () => {
    const rows = registrations.data ?? [];
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['ชื่อ-นามสกุล', 'รหัสนักศึกษา', 'อีเมล', 'หลักสูตร', 'ภาค', 'สถาบัน', 'เพศ', 'อายุ', 'ระดับการศึกษา', 'สาขา/วิชาเอก', 'สถานะผู้เข้าร่วม', 'ต้องการ SIM', 'สถานะการอนุมัติ', 'ผลการเรียน', 'วันที่ลงทะเบียน'];
    const data = rows.map((r: any) => [
      r.guest_name, r.student_id, r.guest_email, r.training_title, (r as any).session_region ?? '', r.institute_name,
      r.gender, r.age, r.education_level, r.field_of_study, r.participant_status,
      r.wants_sim === 1 || r.wants_sim === true ? 'ต้องการ' : r.wants_sim === 0 || r.wants_sim === false ? 'ไม่ต้องการ' : '',
      r.approval_status, r.completion_status,
      r.created_at ? new Date(r.created_at).toLocaleDateString('th-TH') : '',
    ].map(escape).join(','));
    const csv = '﻿' + [headers.join(','), ...data].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toDatetimeLocal = (d: any) => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
  };

  const openNew = () => { setForm(empty); setShowSessionForm(false); setSessionForm(emptySessionForm); setEditingSessionId(null); setDialogOpen(true); };
  const openEdit = (t: any) => {
    setForm({
      id: t.id, title: t.title, description: t.description ?? "", category: t.category ?? "",
      instructor: t.instructor ?? "", location: t.location ?? "",
      start_date: toDatetimeLocal(t.start_date),
      end_date: toDatetimeLocal(t.end_date),
      capacity: t.capacity, is_published: !!t.is_published,
      cover_image_url: t.cover_image_url ?? "",
      online_url: t.online_url ?? "",
      attachment_1_url: t.attachment_1_url ?? "", attachment_1_name: t.attachment_1_name ?? "",
      attachment_2_url: t.attachment_2_url ?? "", attachment_2_name: t.attachment_2_name ?? "",
      attachment_3_url: t.attachment_3_url ?? "", attachment_3_name: t.attachment_3_name ?? "",
      course_type: (t.course_type ?? "elective") as "core" | "elective",
      prerequisite_training_id: t.prerequisite_training_id ?? "",
      required_for_contest: !!t.required_for_contest,
    });
    setShowSessionForm(false); setSessionForm(emptySessionForm); setEditingSessionId(null);
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
            <TabsTrigger value="users">ผู้ใช้งาน</TabsTrigger>
            <TabsTrigger value="institutes">สถาบัน</TabsTrigger>
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
                      <TableCell className="space-x-1">
                        {t.is_published ? <Badge>เผยแพร่</Badge> : <Badge variant="secondary">ซ่อน</Badge>}
                        {!!t.required_for_contest && <Badge variant="outline" className="border-yellow-500 text-yellow-600">ต้องผ่านประกวด</Badge>}
                      </TableCell>
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
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={exportRegistrationsCSV} disabled={!registrations.data?.length} className="gap-2">
                <Download className="h-4 w-4" />Export CSV
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setRegSort(s => s?.col === 'guest_name' ? { col: 'guest_name', dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: 'guest_name', dir: 'asc' })}>
                      ผู้ลงทะเบียน {regSort?.col === 'guest_name' ? (regSort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setRegSort(s => s?.col === 'training_title' ? { col: 'training_title', dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: 'training_title', dir: 'asc' })}>
                      หลักสูตร {regSort?.col === 'training_title' ? (regSort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setRegSort(s => s?.col === 'institute_name' ? { col: 'institute_name', dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: 'institute_name', dir: 'asc' })}>
                      สถาบัน {regSort?.col === 'institute_name' ? (regSort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </TableHead>
                  <TableHead>ภาค</TableHead>
                  <TableHead>SIM</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ผลการเรียน</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {([...(registrations.data ?? [])].sort((a: any, b: any) => {
                    if (!regSort) return 0;
                    const av = (a[regSort.col] ?? '').toString().toLowerCase();
                    const bv = (b[regSort.col] ?? '').toString().toLowerCase();
                    return regSort.dir === 'asc' ? av.localeCompare(bv, 'th') : bv.localeCompare(av, 'th');
                  })).map((r: any) => {
                    const cs: string = r.completion_status ?? "enrolled";
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.guest_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{r.guest_email}</div>
                          {r.student_id && <div className="text-xs text-muted-foreground">รหัส: {r.student_id}</div>}
                        </TableCell>
                        <TableCell>{r.training_title || r.training_id}</TableCell>
                        <TableCell className="text-sm">{r.institute_name || r.institute_id || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(r as any).session_region || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {r.wants_sim === 1 || r.wants_sim === true ? "ต้องการ" : r.wants_sim === 0 || r.wants_sim === false ? "ไม่ต้องการ" : "-"}
                        </TableCell>
                        <TableCell><Badge variant={r.approval_status === "approved" ? "default" : "secondary"}>{r.approval_status ?? "pending"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
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
                            {r.self_confirmed_at && cs === "enrolled" && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                ✅ นักเรียนยืนยันเข้าเรียนแล้ว
                              </span>
                            )}
                          </div>
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

          <TabsContent value="users" className="mt-4">
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>สถาบัน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่สมัคร</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(users.data ?? []).map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || '-'}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        {u.role === 'admin' && <Badge>ผู้ดูแลระบบ</Badge>}
                        {u.role === 'advisor' && <Badge variant="outline">อาจารย์ที่ปรึกษา</Badge>}
                        {u.role === 'student' && <Badge variant="secondary">นักศึกษา</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{u.institute_name || '-'}</TableCell>
                      <TableCell>
                        {u.is_active ? <Badge className="bg-green-600 hover:bg-green-600">ใช้งาน</Badge> : <Badge variant="secondary">ยังไม่ยืนยัน</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="institutes" className="mt-4">
            <Card className="p-0">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">สถาบัน ({(institutes.data ?? []).length})</h2>
                <p className="mt-1 text-xs text-muted-foreground">กำหนดภาคของแต่ละสถาบันเพื่อให้ระบบแสดงรอบการเรียนที่ตรงกัน</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อสถาบัน</TableHead>
                    <TableHead className="w-48">ภาค</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(institutes.data ?? []).map((inst: any) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>
                        <Select
                          value={inst.region ?? "__none__"}
                          onValueChange={async (v) => {
                            try {
                              await updateInstituteRegionFn({ data: { id: inst.id, region: v === "__none__" ? null : v } });
                              qc.invalidateQueries({ queryKey: ["admin-institutes"] });
                              toast.success("บันทึกแล้ว");
                            } catch (e: any) {
                              toast.error(e?.message ?? "เกิดข้อผิดพลาด");
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-40 text-sm">
                            <SelectValue placeholder="ไม่ระบุ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                            {REGIONS.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2"><input type="checkbox" id="pub" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /><Label htmlFor="pub">เผยแพร่</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="req-contest" checked={form.required_for_contest} onChange={(e) => setForm({ ...form, required_for_contest: e.target.checked })} /><Label htmlFor="req-contest">หลักสูตรที่ต้องผ่านสำหรับการประกวด</Label></div>
            </div>
            <div className="md:col-span-2">
              <Label>รูปหน้าปก (URL)</Label>
              <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <Label>Link สำหรับเข้าเรียน Online (URL)</Label>
              <Input value={form.online_url} onChange={(e) => setForm({ ...form, online_url: e.target.value })} placeholder="https://meet.google.com/... หรือ https://zoom.us/..." />
            </div>
            <div className="md:col-span-2 space-y-2 rounded-md border p-3">
              <Label className="text-sm font-semibold">เอกสารแนบหลักสูตร</Label>
              {([1, 2, 3] as const).map((n) => {
                const urlKey = `attachment_${n}_url` as keyof TrainingForm;
                const nameKey = `attachment_${n}_name` as keyof TrainingForm;
                return (
                  <div key={n} className="grid gap-2 md:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">เอกสาร {n} — ชื่อไฟล์</Label>
                      <Input value={form[nameKey] as string} onChange={(e) => setForm({ ...form, [nameKey]: e.target.value })} placeholder={`เช่น คู่มือ${n}.pdf`} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">เอกสาร {n} — URL</Label>
                      <Input value={form[urlKey] as string} onChange={(e) => setForm({ ...form, [urlKey]: e.target.value })} placeholder="https://..." />
                    </div>
                  </div>
                );
              })}
            </div>
            {form.id && (
              <div className="md:col-span-2 space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">รอบการสอน (แยกตามภาค)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowSessionForm(true); setEditingSessionId(null); setSessionForm(emptySessionForm); }}>
                    <Plus className="mr-1 h-3 w-3" />เพิ่มรอบ
                  </Button>
                </div>
                {sessions.data && sessions.data.length > 0 && (
                  <div className="space-y-2">
                    {sessions.data.map((s: any) => (
                      <div key={s.id} className="flex items-start justify-between gap-2 rounded-md border bg-muted/20 p-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-primary">{s.region}</div>
                          <div>{new Date(s.start_datetime).toLocaleString('th-TH')} — {new Date(s.end_datetime).toLocaleString('th-TH')}</div>
                          {s.location && <div className="text-muted-foreground">📍 {s.location}</div>}
                          {s.online_url && <div className="text-muted-foreground">🔗 {s.online_url}</div>}
                          <div className="text-muted-foreground">ที่นั่ง: {s.reg_count}/{s.capacity}</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button type="button" size="sm" variant="ghost" onClick={() => {
                            const dt = (d: string) => d ? new Date(d).toISOString().slice(0,16) : '';
                            setSessionForm({ region: s.region, start_datetime: dt(s.start_datetime), end_datetime: dt(s.end_datetime), location: s.location ?? '', online_url: s.online_url ?? '', capacity: s.capacity });
                            setEditingSessionId(s.id);
                            setShowSessionForm(true);
                          }}><Pencil className="h-3 w-3" /></Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => { if (confirm('ลบรอบนี้?')) deleteSession.mutate(s.id); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showSessionForm && (
                  <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <Label className="text-xs">ภาค *</Label>
                        <Select value={sessionForm.region} onValueChange={(v) => setSessionForm({ ...sessionForm, region: v as typeof REGIONS[number] })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="เลือกภาค" /></SelectTrigger>
                          <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">จำนวนที่นั่ง</Label>
                        <Input type="number" className="h-8" value={sessionForm.capacity} onChange={(e) => setSessionForm({ ...sessionForm, capacity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label className="text-xs">เริ่ม *</Label>
                        <Input type="datetime-local" className="h-8" value={sessionForm.start_datetime} onChange={(e) => setSessionForm({ ...sessionForm, start_datetime: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">สิ้นสุด *</Label>
                        <Input type="datetime-local" className="h-8" value={sessionForm.end_datetime} onChange={(e) => setSessionForm({ ...sessionForm, end_datetime: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">สถานที่</Label>
                        <Input className="h-8" value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Online URL</Label>
                        <Input className="h-8" value={sessionForm.online_url} onChange={(e) => setSessionForm({ ...sessionForm, online_url: e.target.value })} placeholder="https://meet.google.com/..." />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => saveSession.mutate({ ...sessionForm, id: editingSessionId ?? undefined })} disabled={saveSession.isPending || !sessionForm.region || !sessionForm.start_datetime || !sessionForm.end_datetime}>
                        {saveSession.isPending ? 'กำลังบันทึก...' : 'บันทึกรอบ'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setShowSessionForm(false); setEditingSessionId(null); setSessionForm(emptySessionForm); }}>ยกเลิก</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
