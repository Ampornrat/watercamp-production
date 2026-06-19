# Thaiwater Challenge — Water Camp

โครงการอบรมเยาวชนด้านเทคโนโลยีคลังข้อมูลน้ำ

**Tech**: TanStack Start (SSR React) + Supabase + Tailwind + Bun

---

## หลัง clone ต้องทำอะไรบ้าง

### 1. ติดตั้ง Bun (ครั้งแรกของเครื่องเท่านั้น)

```powershell
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

ตรวจว่าติดตั้งสำเร็จ:
```powershell
bun --version
```

### 2. ติดตั้ง dependencies

```powershell
bun install
```

### 3. สร้างไฟล์ `.env`

```powershell
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

ขอ **ค่าจริงของ `.env`** จากหัวหน้าทีม (อยู่ใน shared vault — ไม่ขอส่งทาง Slack/email ดิบเพราะมี Supabase keys)

paste ค่าทับใน `.env`

### 4. รัน dev server

```powershell
bun run dev
```

เปิด http://localhost:3000 — ถ้าเห็นเว็บ = พร้อมพัฒนา

---

## Push เข้า git → Auto deploy

แก้ code → commit → push เข้า branch `main`:

```powershell
git add .
git commit -m "your message"
git push
```

GitHub Actions รัน workflow [Build and Deploy](.github/workflows/deploy.yml) อัตโนมัติ — **ไม่ต้องตั้ง secret อะไรเพิ่ม** เพราะ Docker Hub / Supabase keys ถูกตั้งใน repo secrets ไว้แล้ว

### Push แบบไหน → deploy / ไม่ deploy

| แก้ไฟล์ | Auto deploy? |
|---|---|
| `src/**`, `package.json`, `Dockerfile`, config ที่กระทบ build | ✅ Deploy |
| `*.md`, `.env.example`, `.gitignore`, `e2e/**`, `.vscode/**` | ❌ Skip |
| commit message มี `[skip ci]` (เช่น `git commit -m "wip [skip ci]"`) | ❌ Skip |

### Force deploy โดยไม่แก้ code

ใช้เมื่อ image มีปัญหา / อยาก rebuild:

1. ไปที่ [Actions tab](https://github.com/Ampornrat/watercamp-production/actions)
2. คลิก **Build and Deploy** ทางซ้าย
3. มุมขวา → **Run workflow** → เลือก branch `main` → **Run workflow**

---

## ⏱ จาก push ถึง live ใช้เวลาเท่าไหร่

```
git push
  ↓ ~3 นาที — GitHub Actions build + push image เข้า Docker Hub
  ↓ สูงสุด 15 นาที — container platform ดึง image ใหม่และ rollout เอง
Live ที่ https://watercamp.kwunjai.com
```

**รวม 3-18 นาที** จาก push ถึงเห็นการเปลี่ยนแปลงในเว็บ

ถ้าอยากเห็นทันที (ไม่รอ 15 นาที) แจ้ง admin ของทีมให้ trigger pull ให้

---

## ดู Action / ตรวจ error

### URL ที่ใช้บ่อย

- **Actions runs**: https://github.com/Ampornrat/watercamp-production/actions
- **Live site**: https://watercamp.kwunjai.com

### ดูว่า workflow สำเร็จไหม

ที่หน้า Actions tab:
- 🟢 **สีเขียว** = build + push สำเร็จ → รอ deploy อัตโนมัติ (สูงสุด 15 นาที)
- 🔴 **สีแดง** = มี error → คลิกเข้าไปดู

### ดูว่า fail ที่ step ไหน

1. คลิกชื่อ workflow run ที่แดง
2. คลิก job **build-and-deploy** (กลางหน้า)
3. หา step ที่มีเครื่องหมาย ❌ → คลิกเพื่อขยาย log
4. อ่าน error message

### Error ที่เจอบ่อย

| Error | สาเหตุ | วิธีแก้ |
|---|---|---|
| `unauthorized: incorrect username or password` ที่ Login to Docker Hub | Docker Hub token หมดอายุ / โดน revoke | แจ้ง admin สร้าง token ใหม่ + อัปเดต `DOCKERHUB_TOKEN` ใน repo secrets |
| `failed to compute cache key` / `cache error` | Build cache ขัดข้อง | กด **Re-run all jobs** มุมขวาบนของหน้า run |
| Build fail ที่ vite / TypeScript error | code มี syntax / type error | อ่าน log → แก้ code ตามที่บอก → push ใหม่ |
| Build fail ที่ `bun install` | network โหลด package พลาด | กด **Re-run all jobs** ปกติหายเอง |
| Workflow ไม่รันหลัง push | แก้แค่ไฟล์ที่อยู่ใน `paths-ignore` หรือ commit message มี `[skip ci]` | normal — ใช้ Force deploy ถ้าจำเป็น |
| Workflow เขียวแล้วแต่เว็บยังไม่เปลี่ยน | container platform ยังไม่ pull image ใหม่ | รอจนครบ 15 นาที หรือแจ้ง admin |

---

## Scripts

```powershell
bun run dev        # dev server มี HMR
bun run build      # production build
bun run test       # unit tests (Vitest)
bun run lint       # ESLint check
bun run format     # Prettier format
```

---

## ไฟล์ที่ gitignored — ต้องสร้างเอง

| ไฟล์ / โฟลเดอร์ | สร้างยังไง |
|---|---|
| `.env` | `cp .env.example .env` แล้วเติมค่าจาก shared vault |
| `node_modules/` | `bun install` |
| `.output/` | สร้างอัตโนมัติเมื่อ `bun run build` |

> `.lovable/` เป็น metadata ของ Lovable.dev — ไม่ต้องสร้าง โปรเจกต์รันได้โดยไม่มี

---

## ⚠️ ห้ามทำ

- ❌ **อย่า commit `.env`** — มี Supabase keys อยู่ (ถ้าหลุดต้อง rotate ใหม่ทันที)
- ❌ **อย่า commit service_role key** (`sb_secret_*`) — GitHub block อยู่แล้ว แต่อันตรายมากถ้าหลุด
- ❌ **อย่าแชร์ `.env` ผ่าน Slack / email / chat ดิบ** — ใช้ 1Password หรือ encrypted channel
- ✅ ลืม push secret ไปแล้ว? → rotate Supabase key ทันที + แจ้งทีม
