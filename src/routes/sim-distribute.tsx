import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone, X, Download, Search, ChevronLeft, ChevronRight, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchSimRequests, createSimDistribution, getSimDistributions } from "@/lib/sim-distribute.functions";
import { getAllInstitutes } from "@/lib/trainings.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/sim-distribute")({
  head: () => ({
    meta: [{ title: "แจก SIM โทรศัพท์ | ThaiWater Challenge" }],
  }),
  beforeLoad: async () => {
    const user = await getSession();
    if (!user || (user.role !== 'admin' && user.role !== 'advisor')) {
      throw redirect({ to: '/login' });
    }
    return { user };
  },
  component: SimDistributePage,
});

type SearchResult = {
  id: string; // registration id
  full_name: string;
  student_id: string;
  institute_id: string;
  institute_name: string;
  email: string;
  sim_request_id: string | null;
  wants_sim: number;
};

function formatDate(s: string) {
  return new Date(s).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SimDistributeContent() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return null;
  return <SimDistributeInner user={user} />;
}

function SimDistributePage() {
  const { user } = Route.useRouteContext();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-12">
        <SimDistributeInner user={user} />
      </main>
      <SiteFooter />
    </div>
  );
}

function SimDistributeInner({ user }: { user: { role: string; institute_id: string | null; institute_name: string | null } }) {
  const isAdvisor = user.role === 'advisor';

  const searchFn = useServerFn(searchSimRequests);
  const distributeFn = useServerFn(createSimDistribution);
  const getDistributionsFn = useServerFn(getSimDistributions);
  const getAllInstitutesFn = useServerFn(getAllInstitutes);
  const queryClient = useQueryClient();

  // Institute selection — advisor: locked to own institute, admin: free choice
  const [selectedInstituteId, setSelectedInstituteId] = useState<string>(
    isAdvisor && user.institute_id ? user.institute_id : ""
  );
  const [selectedInstituteName, setSelectedInstituteName] = useState<string>(
    isAdvisor && user.institute_name ? user.institute_name : ""
  );

  const { data: institutes = [] } = useQuery({
    queryKey: ["institutes"],
    queryFn: () => getAllInstitutesFn(),
    enabled: !isAdvisor,
  });

  // Search autocomplete state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce: 300ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch results via useQuery — enabled only when institute selected, dropdown open, nothing selected
  const { data: results = [] } = useQuery({
    queryKey: ["sim-search", debouncedQuery, selectedInstituteId],
    queryFn: () => searchFn({ data: { q: debouncedQuery, institute_id: selectedInstituteId || undefined } }),
    enabled: focused && !selected && !!selectedInstituteId,
    staleTime: 0,
  });

  const showDropdown = focused && !selected;

  // Pagination
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // History table
  const { data: distributions = [], refetch } = useQuery({
    queryKey: ["sim-distributions"],
    queryFn: () => getDistributionsFn(),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectStudent(s: SearchResult) {
    setSelected(s);
    setQuery(s.full_name);
    setFocused(false);
  }

  function clearSelected() {
    setSelected(null);
    setQuery("");
    setDebouncedQuery("");
    setFocused(false);
  }

  function validatePhone(val: string) {
    if (!val) return "กรุณากรอกเบอร์โทร SIM";
    if (!/^0\d{9}$/.test(val)) return "เบอร์โทรต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePhone(phoneNumber);
    if (err) { setPhoneError(err); return; }
    if (!selected) return;

    setSubmitting(true);
    try {
      await distributeFn({
        data: {
          registration_id: selected.id,
          phone_number: phoneNumber,
          note: note.trim() || undefined,
        },
      });
      toast.success("บันทึกการแจก SIM สำเร็จ");
      clearSelected();
      setPhoneNumber("");
      setNote("");
      setPhoneError("");
      setPage(1);
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      distributions.map((d, i) => ({
        ลำดับ: i + 1,
        ชื่อนักศึกษา: d.student_name,
        มหาวิทยาลัย: d.institute_name,
        เบอร์SIM: d.phone_number,
        แจกโดย: d.distributed_by,
        วันที่แจก: formatDate(d.distributed_at),
        หมายเหตุ: d.note ?? "",
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "ประวัติแจก SIM");
    XLSX.writeFile(wb, `sim-distributions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            <h1 className="font-heading text-2xl font-extrabold text-foreground md:text-3xl">
              แจก SIM โทรศัพท์
            </h1>
          </div>

          {/* Form */}
          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-muted-foreground">
                บันทึกการแจก SIM ให้นักศึกษา
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Field 1: มหาวิทยาลัย */}
                <div className="space-y-1.5">
                  <Label htmlFor="institute">
                    มหาวิทยาลัย <span className="text-destructive">*</span>
                  </Label>
                  {isAdvisor ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-foreground">{selectedInstituteName || "—"}</span>
                    </div>
                  ) : (
                    <Select
                      value={selectedInstituteId}
                      onValueChange={(val) => {
                        const inst = institutes.find((i: any) => i.id === val);
                        setSelectedInstituteId(val);
                        setSelectedInstituteName(inst?.name ?? "");
                        clearSelected();
                      }}
                    >
                      <SelectTrigger id="institute">
                        <SelectValue placeholder="เลือกมหาวิทยาลัย" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutes.map((i: any) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Field 2: Autocomplete ชื่อนักศึกษา */}
                <div className="space-y-1.5">
                  <Label htmlFor="search">
                    ชื่อ-นามสกุลนักศึกษา <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="search"
                        type="text"
                        placeholder={selectedInstituteId ? "พิมพ์ชื่อเพื่อค้นหา..." : "เลือกมหาวิทยาลัยก่อน"}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => { if (selectedInstituteId) setFocused(true); }}
                        disabled={!!selected || !selectedInstituteId}
                        autoComplete="off"
                        className="pl-9"
                      />
                      {(query || selected) && (
                        <button
                          type="button"
                          onClick={clearSelected}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {showDropdown && results.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg">
                        {results.map((r) => {
                          const received = r.wants_sim === 2;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => selectStudent(r)}
                              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted first:rounded-t-xl last:rounded-b-xl ${received ? 'bg-red-50 hover:bg-red-100' : ''}`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className={`font-medium ${received ? 'text-red-600' : 'text-foreground'}`}>
                                  {r.full_name}
                                </span>
                                <span className="text-xs text-muted-foreground">{r.student_id}</span>
                              </div>
                              {received && (
                                <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                                  รับ SIM แล้ว
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {showDropdown && results.length === 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg">
                        {query ? "ไม่พบนักศึกษาที่ตรงกัน" : "ไม่มีรายการที่รอรับ SIM"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone_number">
                    เบอร์โทร SIM ที่แจก <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="เช่น 0812345678"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError(validatePhone(e.target.value));
                    }}
                    className={phoneError ? "border-destructive" : ""}
                    maxLength={10}
                  />
                  {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
                  <Textarea
                    id="note"
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl"
                  disabled={!selected || !phoneNumber || submitting}
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกการแจก SIM"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* History */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(distributions.length / PAGE_SIZE));
            const safePage = Math.min(page, totalPages);
            const pageItems = distributions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            return (
              <Card className="rounded-3xl shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-base font-semibold text-muted-foreground">
                    ประวัติการแจก SIM ({distributions.length} รายการ)
                  </CardTitle>
                  {distributions.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2 rounded-xl">
                      <Download className="h-4 w-4" />
                      Export Excel
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {distributions.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการแจก SIM</p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">ลำดับ</TableHead>
                            <TableHead>ชื่อนักศึกษา</TableHead>
                            <TableHead>มหาวิทยาลัย</TableHead>
                            <TableHead>เบอร์ SIM</TableHead>
                            <TableHead>วันที่แจก</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageItems.map((d, i) => (
                            <TableRow key={d.id}>
                              <TableCell className="text-center text-muted-foreground">
                                {(safePage - 1) * PAGE_SIZE + i + 1}
                              </TableCell>
                              <TableCell className="font-medium">{d.student_name}</TableCell>
                              <TableCell className="text-muted-foreground">{d.institute_name}</TableCell>
                              <TableCell className="font-mono">{d.phone_number}</TableCell>
                              <TableCell className="text-muted-foreground">{formatDate(d.distributed_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-6 py-3">
                          <span className="text-sm text-muted-foreground">
                            หน้า {safePage} / {totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0"
                              disabled={safePage <= 1}
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                                acc.push(p);
                                return acc;
                              }, [])
                              .map((p, idx) =>
                                p === "…" ? (
                                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">…</span>
                                ) : (
                                  <Button
                                    key={p}
                                    variant={p === safePage ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 w-8 rounded-lg p-0"
                                    onClick={() => setPage(p as number)}
                                  >
                                    {p}
                                  </Button>
                                )
                              )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0"
                              disabled={safePage >= totalPages}
                              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}
    </div>
  );
}
