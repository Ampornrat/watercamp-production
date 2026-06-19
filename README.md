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

#### ✅ ตัวอย่าง push ที่ **deploy**

แก้ source code แล้ว push ปกติ — workflow จะรันให้เอง:

```powershell
# แก้ไฟล์ใน src/ (เช่น เปลี่ยน text บนหน้าเว็บ)
git add src/routes/index.tsx
git commit -m "fix: ปรับ text หัวข้อ"
git push
```

→ ภายใน 3-18 นาที จะเห็นการเปลี่ยนแปลงที่ https://watercamp.kwunjai.com

#### ❌ ตัวอย่าง push ที่ **ไม่ deploy**

แก้แค่ docs / config ที่ไม่กระทบ build — workflow ข้ามอัตโนมัติ:

```powershell
# แก้แค่ README ไม่ต้อง deploy
git add README.md
git commit -m "docs: แก้ typo ใน README"
git push
```

#### หรือบังคับ skip ตอน commit (แม้จะแก้ source code) ให้ใส่ [skip ci] ในข้อความ:

```powershell
git add src/routes/index.tsx
git commit -m "wip: ทดสอบ local ก่อน [skip ci]"
git push
```

→ image บน Docker Hub และ live site **ไม่เปลี่ยน**

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

## เปลี่ยน Supabase project (ย้ายจาก Lovable → account ของทีมเอง)

ถ้าจะย้ายจาก Supabase ที่ใช้ร่วมกับ Lovable มาเป็น project ใหม่ของทีมเอง ต้องแก้หลายจุดให้ครบ ไม่งั้นเว็บจะเชื่อม DB ไม่ตรงกัน

### 1. สร้าง Supabase project ใหม่

ที่ https://supabase.com/dashboard → **New project**

เก็บค่าจาก **Project Settings → API**:

| ค่า | จะใช้ที่ไหน |
|---|---|
| Project URL (`https://xxx.supabase.co`) | env var ทุกที่ |
| Project ID (`xxx`) | env var ทุกที่ |
| `publishable` / `anon` key | client + server |
| `service_role` key (`sb_secret_*`) | ใส่ใน Supabase Vault เท่านั้น — **ห้าม commit / ห้ามใส่ใน env var** |

### 2. Run migrations ลง project ใหม่

ติดตั้ง [Supabase CLI](https://supabase.com/docs/guides/local-development) แล้ว:

```powershell
supabase login
supabase link --project-ref <NEW_PROJECT_ID>
supabase db push
```

### 3. ตั้ง Vault secret (สำคัญ — ไม่งั้น email/queue ไม่ทำงาน)

ที่ Supabase Dashboard → **SQL Editor** รัน:

```sql
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name='email_queue_service_role_key'),
  'sb_secret_YOUR_NEW_SERVICE_ROLE_KEY',
  'email_queue_service_role_key'
);
```

(migration `20260528091115_*.sql` มี placeholder ที่ต้องใส่ค่าจริงด้วยตัวเอง)

### 4. ตั้ง Auth URLs

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://watercamp.kwunjai.com`
- **Redirect URLs**: เพิ่ม `https://watercamp.kwunjai.com/**` + `http://localhost:3000/**` (สำหรับ dev)

### 5. อัปเดต `.env` ในเครื่อง local

แก้ทั้ง 6 ตัว — `VITE_*` (client) และไม่มี prefix (server) ต้องชี้ไป project เดียวกัน:

```
VITE_SUPABASE_URL="https://NEW_ID.supabase.co"
VITE_SUPABASE_PROJECT_ID="NEW_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_NEW_KEY"
SUPABASE_URL="https://NEW_ID.supabase.co"
SUPABASE_PROJECT_ID="NEW_ID"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_NEW_KEY"
```

แจ้งทีมให้อัปเดตค่าใน shared vault ด้วย

### 6. อัปเดต GitHub Secrets (สำหรับ CI build)

ไปที่ repo → **Settings → Secrets and variables → Actions** อัปเดต 3 ตัว:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

(client keys ถูก bake เข้า bundle ตอน build — ต้อง re-build หลังแก้)

### 7. อัปเดต env vars บน production runtime (แจ้ง admin)

ค่า `SUPABASE_*` (ไม่มี `VITE_`) ใช้ตอน runtime บน server — admin ของทีมจะเป็นคนอัปเดตให้ตรง

### 8. Force re-build + redeploy

หลังอัปเดต GitHub Secrets เสร็จ ต้อง re-build image (ของเดิมยัง bake key เก่าไว้):

ไปที่ [Actions tab](https://github.com/Ampornrat/watercamp-production/actions) → **Build and Deploy** → **Run workflow** → main → **Run workflow**

รอจน build เสร็จ + admin trigger pull image ใหม่บน container platform → ตรวจเว็บว่าเชื่อม DB ใหม่ได้

### (Optional) ย้ายข้อมูลจาก DB เก่า

ใช้ `pg_dump` / `pg_restore`:

```powershell
# Export จาก Supabase เก่า (เอา connection string จาก Settings → Database)
pg_dump "postgres://OLD_CONNECTION_STRING" --no-owner --no-acl > backup.sql

# Import เข้า Supabase ใหม่
psql "postgres://NEW_CONNECTION_STRING" < backup.sql
```

⚠️ **Storage files** (รูป / ไฟล์ upload) ใน `storage.objects` ต้อง copy แยก — ไม่มากับ pg_dump ปกติ ใช้ Supabase Storage API หรือ download/reupload เอง

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
