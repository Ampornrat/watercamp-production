import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";
import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Smartphone, X, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchSimRequests, createSimDistribution, getSimDistributions } from "@/lib/sim-distribute.functions";

export const Route = createFileRoute("/sim-distribute")({
  head: () => ({
    meta: [{ title: "แจก SIM โทรศัพท์ | ThaiWater Challenge" }],
  }),
  beforeLoad: async () => {
    const user = await getSession();
    if (!user || (user.role !== 'admin' && user.role !== 'advisor')) {
      throw redirect({ to: '/login' });
    }
  },
  component: SimDistributePage,
});

type SearchResult = {
  id: string;
  full_name: string;
  student_id: string;
  institute_id: string;
  institute_name: string;
  email: string;
};

function formatDate(s: string) {
  return new Date(s).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function SimDistributePage() {
  const searchFn = useServerFn(searchSimRequests);
  const distributeFn = useServerFn(createSimDistribution);
  const getDistributionsFn = useServerFn(getSimDistributions);
  const queryClient = useQueryClient();

  // Search autocomplete state
  const [query, setQuery] = useState("");           // displayed in input (immediate)
  const [debouncedQuery, setDebouncedQuery] = useState(""); // actual search term (debounced)
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce: 300ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch results via useQuery — enabled only when dropdown is open and nothing is selected
  const { data: results = [] } = useQuery({
    queryKey: ["sim-search", debouncedQuery],
    queryFn: () => searchFn({ data: { q: debouncedQuery } }),
    enabled: focused && !selected,
    staleTime: 0,
  });

  const showDropdown = focused && !selected;

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
          sim_request_id: selected.id,
          phone_number: phoneNumber,
          note: note.trim() || undefined,
        },
      });
      toast.success("บันทึกการแจก SIM สำเร็จ");
      clearSelected();
      setPhoneNumber("");
      setNote("");
      setPhoneError("");
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
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="container mx-auto flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
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
                {/* Autocomplete */}
                <div className="space-y-1.5">
                  <Label htmlFor="search">
                    ชื่อ-นามสกุล <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="search"
                        type="text"
                        placeholder="คลิกหรือพิมพ์ชื่อเพื่อค้นหาจากผู้ลงทะเบียน..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setFocused(true)}
                        disabled={!!selected}
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
                        {results.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => selectStudent(r)}
                            className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span className="font-medium text-foreground">{r.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {r.student_id} · {r.institute_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDropdown && results.length === 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-lg">
                        {query ? "ไม่พบนักศึกษาที่ตรงกัน" : "ไม่มีรายการที่รอรับ SIM"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Institute (read-only) */}
                <div className="space-y-1.5">
                  <Label htmlFor="institute">มหาวิทยาลัย</Label>
                  <Input
                    id="institute"
                    type="text"
                    readOnly
                    value={selected?.institute_name ?? ""}
                    placeholder="กรอกจากข้อมูลนักศึกษาที่เลือก"
                    className="cursor-default bg-muted text-muted-foreground"
                  />
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
                    {distributions.map((d, i) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{d.student_name}</TableCell>
                        <TableCell className="text-muted-foreground">{d.institute_name}</TableCell>
                        <TableCell className="font-mono">{d.phone_number}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(d.distributed_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
