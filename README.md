# Thaiwater Challenge — Water Camp

โครงการอบรมและคัดเลือกเยาวชนด้านเทคโนโลยีคลังข้อมูลน้ำ

เว็บไซต์สำหรับรับสมัคร / ลงทะเบียน / จัดการหลักสูตรอบรม และการแข่งขัน

---

## Tech Stack

- **Frontend & Backend**: [TanStack Start](https://tanstack.com/start) (SSR React framework บน Vite)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Runtime / Package manager**: [Bun](https://bun.sh/)
- **Container**: Docker (multi-stage build)
- **CI/CD**: GitHub Actions → Docker Hub → OpenShift (INET)

---

## Prerequisites

| Tool | Version | จำเป็น? |
|---|---|---|
| [Bun](https://bun.sh/) | 1.2+ | ✅ ต้องมี |
| [Git](https://git-scm.com/) | any | ✅ ต้องมี |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | latest | ⚪ optional (ถ้าจะ build container) |
| Supabase account | — | ✅ ต้องมี (ใช้เป็น backend) |

ตรวจว่ามี Bun ติดตั้ง:
```powershell
bun --version
```

ถ้ายังไม่มี:
```powershell
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash
```

---

## Quick Start (Local Development)

### 1. Clone repository

```powershell
git clone https://github.com/Ampornrat/watercamp-production.git
cd watercamp-production
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

จากนั้นแก้ค่าใน `.env` ให้ตรงกับ Supabase project ของคุณ (ดูหัวข้อ [Environment Variables](#environment-variables))

### 4. รัน dev server

```powershell
bun run dev
```

เปิด http://localhost:3000

---

## Environment Variables

ไฟล์ `.env` ถูก gitignore เพื่อความปลอดภัย — แต่ละคนต้องสร้างเอง

### ที่มาของแต่ละค่า

| Variable | เอามาจากไหน |
|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID` | ส่วน sub-domain ของ Project URL (เช่น `abc123` จาก `https://abc123.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API → `anon` / `publishable` key |

### ทำไมต้องมี `VITE_` และไม่มี `VITE_` คู่กัน?

- **`VITE_*`** — Vite บันทึกค่านี้เข้าไปใน **client bundle ตอน build** → ใช้ใน browser (เช่น `src/integrations/supabase/client.ts`)
- **ไม่มี `VITE_`** — อ่านตอน runtime บน **server** (เช่น SSR, server functions) — ไม่ติดไปกับ client

ค่าทั้ง 2 ชุดควรชี้ไป Supabase project เดียวกัน

⚠️ **อย่าใส่ service_role key** (`sb_secret_*`) ลงไฟล์นี้ — เก็บเฉพาะใน Supabase Vault หรือ secret store ของ infrastructure (เช่น OpenShift Secrets, K8s Secrets)

---

## Available Scripts

```powershell
bun run dev          # dev server with HMR (http://localhost:3000)
bun run build        # production build (output: .output/ via Nitro)
bun run build:dev    # build in development mode
bun run preview      # serve the production build locally
bun run test         # run unit tests (Vitest)
bun run test:e2e     # run end-to-end tests (Playwright)
bun run lint         # ESLint check
bun run format       # Prettier format all files
```

---

## Project Structure

```
.
├── .github/workflows/      # GitHub Actions CI/CD
│   └── deploy.yml          # Build & push image on push to main
├── e2e/                    # Playwright end-to-end tests
├── src/
│   ├── routes/             # File-based routes (TanStack Router)
│   ├── components/         # Reusable React components
│   │   └── ui/             # shadcn/ui primitives
│   ├── integrations/       # External service clients (Supabase, etc.)
│   ├── lib/                # Utilities & helpers
│   ├── hooks/              # Custom React hooks
│   ├── styles/             # Global CSS
│   └── server.ts           # SSR entry (wraps TanStack Start server-entry)
├── supabase/
│   └── migrations/         # SQL migrations (ใช้ Supabase CLI ในการ run)
├── Dockerfile              # Multi-stage container build
├── .dockerignore           # Files excluded from Docker context
├── vite.config.ts          # Vite config (ใช้กับ Lovable.dev preset)
├── vite.config.docker.ts   # Vite config สำหรับ Docker build (Nitro node-server preset)
└── .env.example            # Template — copy เป็น .env แล้วเติมค่า
```

### ไฟล์ที่ถูก gitignore แต่ต้องสร้างเอง

| ไฟล์/โฟลเดอร์ | ต้องสร้างเมื่อ | วิธีสร้าง |
|---|---|---|
| `.env` | ทุกครั้งหลัง clone | `cp .env.example .env` แล้วเติมค่า |
| `node_modules/` | ทุกครั้งหลัง clone | `bun install` |
| `.output/`, `.nitro/` | หลัง build | `bun run build` |
| `.lovable/` | ⚠️ **ไม่ต้องสร้าง** | (เป็น metadata ของ Lovable.dev เท่านั้น — โปรเจกต์รันได้โดยไม่ต้องมี) |

---

## Building for Production

### แบบ Standalone (ไม่ใช้ Docker)

```powershell
bun run build
```

ผลลัพธ์อยู่ที่ `dist/` (client + server static build)

ถ้าจะให้ออก Nitro server bundle (`.output/server/index.mjs`) ใช้:
```powershell
bun x vite build --config vite.config.docker.ts
node .output/server/index.mjs
```

### แบบ Docker

```powershell
docker build `
  --build-arg VITE_SUPABASE_PROJECT_ID="your_project_id" `
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_key" `
  --build-arg VITE_SUPABASE_URL="https://your_project_id.supabase.co" `
  -t watercamp:latest .
```

รัน container:
```powershell
docker run -d -p 3000:3000 `
  -e SUPABASE_URL="https://your_project_id.supabase.co" `
  -e SUPABASE_PROJECT_ID="your_project_id" `
  -e SUPABASE_PUBLISHABLE_KEY="your_publishable_key" `
  --name watercamp `
  watercamp:latest
```

เปิด http://localhost:3000

> **หมายเหตุเรื่อง 2 Vite configs**: `vite.config.ts` ใช้สำหรับ Lovable.dev deployment (Cloudflare preset), `vite.config.docker.ts` บังคับ Nitro ให้ใช้ `node-server` preset เพื่อรันใน container ได้ ถ้าคุณไม่ได้ใช้ Lovable.dev จะลบ `vite.config.ts` ทิ้งและใช้แค่ตัว docker ก็ได้

---

## Deployment / CI/CD

repository นี้มี GitHub Actions workflow ที่:
1. Build Docker image
2. Push เข้า Docker Hub
3. (default) ปล่อยให้ OpenShift ImageStream poll Docker Hub แล้ว rollout เอง (~15 นาที)

### Setup สำหรับ fork ของคุณเอง

ถ้า clone/fork โปรเจกต์ไปทำต่อในชื่อตัวเอง คุณต้องมี:

#### 1. Docker Hub account
- สมัครที่ https://hub.docker.com (ฟรี)
- สร้าง access token: Account Settings → Security → New Access Token
  - Permissions: **Read, Write, Delete**
  - Copy token (ขึ้นต้น `dckr_pat_...`)

#### 2. Supabase project
- สร้างที่ https://supabase.com (ฟรี tier ใช้ได้)
- เอา URL + publishable key

#### 3. (Optional) Container hosting
- สำหรับ deploy ตัวจริง — เลือก 1 ใน:
  - **OpenShift** (เช่น INET, Red Hat OpenShift Local)
  - **Kubernetes** (GKE, EKS, AKS, ที่อื่น)
  - **Cloud Run** (GCP)
  - **Fly.io / Railway / Render** (simple PaaS)
  - **VPS + Docker** (ใช้ docker run/compose)

#### 4. ตั้ง GitHub Secrets

ไปที่ `https://github.com/<YOUR_USERNAME>/<YOUR_REPO>/settings/secrets/actions` ตั้งค่า:

| Secret name | Value | จำเป็น? |
|---|---|---|
| `DOCKERHUB_USERNAME` | username ของคุณบน Docker Hub | ✅ |
| `DOCKERHUB_TOKEN` | access token จากข้อ 1 | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | จาก Supabase | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | จาก Supabase | ✅ |
| `VITE_SUPABASE_URL` | จาก Supabase | ✅ |

#### 5. แก้ workflow ให้ตรง config ของคุณ

แก้ [.github/workflows/deploy.yml](.github/workflows/deploy.yml) บรรทัด:

```yaml
env:
  IMAGE: smartcms/water-data-camp        # <-- เปลี่ยนเป็น <docker-hub-username>/<image-name> ของคุณ
  OPENSHIFT_NAMESPACE: cust-sms          # <-- ลบทิ้งถ้าไม่ใช้ OpenShift
  IMAGESTREAM: water-data-camp           # <-- ลบทิ้งถ้าไม่ใช้ OpenShift
  DEPLOYMENT: water-data-camp            # <-- ลบทิ้งถ้าไม่ใช้ OpenShift
```

หลัง push เข้า branch `main` workflow จะทำงานอัตโนมัติ

### Skip auto-deploy

ไม่ต้องการให้ workflow รันทุกครั้งที่ push? มี 3 วิธี:

1. **เปลี่ยนเฉพาะไฟล์ที่อยู่ใน `paths-ignore`** — workflow จะ skip อัตโนมัติ (default: `**.md`, `.env.example`, `.gitignore`, `.dockerignore`, prettier configs, `e2e/**`, `.vscode/**`)
2. **ใส่ `[skip ci]` ใน commit message** — บังคับ skip แม้จะเปลี่ยน source code
   ```powershell
   git commit -m "wip: testing locally [skip ci]"
   ```
3. **Push ไป branch อื่นที่ไม่ใช่ `main`** — workflow ตั้ง trigger เฉพาะ main

### Force deploy ทั้งที่ไม่มี code change

ถ้า image บน Docker Hub มีปัญหาหรืออยาก rebuild:
1. ไปที่ Actions tab → **Build and Deploy** workflow
2. มุมขวาบน → **Run workflow** → เลือก branch `main` → **Run workflow**

(ใช้ trigger `workflow_dispatch` ที่กำหนดไว้ใน workflow)

### Deploy ที่ไหนก็ได้ที่รัน Docker container ได้

Image ที่ push ขึ้น Docker Hub เป็น **portable image** — เอาไป deploy ที่ไหนก็ได้:

```bash
# ตัวอย่าง: รันบน VPS Linux ตรงๆ
docker pull <your-dockerhub-username>/watercamp:latest
docker run -d -p 3000:3000 \
  -e SUPABASE_URL="..." \
  -e SUPABASE_PROJECT_ID="..." \
  -e SUPABASE_PUBLISHABLE_KEY="..." \
  --restart unless-stopped \
  <your-dockerhub-username>/watercamp:latest
```

ใช้ reverse proxy (nginx / Caddy) ครอบเพื่อทำ SSL / domain mapping

---

## Database Setup (Supabase)

ไฟล์ migration อยู่ที่ [supabase/migrations/](supabase/migrations/) — รันด้วย Supabase CLI:

```bash
# ติดตั้ง CLI ครั้งเดียว: https://supabase.com/docs/guides/local-development
supabase login
supabase link --project-ref <YOUR_PROJECT_ID>
supabase db push
```

⚠️ Migration `20260528091115_*.sql` มี placeholder `<REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY>` — ต้องอัปเดต Vault เองหลัง run migration:

```sql
-- ใน Supabase Dashboard -> SQL Editor
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name='email_queue_service_role_key'),
  'sb_secret_YOUR_ACTUAL_SERVICE_ROLE_KEY',  -- เอามาจาก Project Settings -> API
  'email_queue_service_role_key'
);
```

---

## Troubleshooting

### `bun install` ค้าง / ช้า
ลองใช้ npm registry แทน: `bun install --registry https://registry.npmjs.org/`

### Dev server แสดง "Cannot connect to Supabase"
ตรวจว่า `.env` มีค่าครบ และไม่มี typo ในชื่อ variable
รีสตาร์ท dev server หลังแก้ `.env`

### Docker build fail ที่ `bun install`
อาจเป็นเพราะ network ในเครื่องบล็อก npm registry — ลอง:
```powershell
docker build --network=host ...
```

### Container รันแล้ว HTTP 502 / connection refused
- ตรวจว่า expose port ตรงกับ `PORT` env var
- ตรวจ logs: `docker logs <container-name>`

### GitHub Actions ขึ้น "unauthorized: incorrect username or password"
- ตรวจ `DOCKERHUB_USERNAME` พิมพ์เล็กตรงตามที่ใช้ใน Docker Hub
- ตรวจ `DOCKERHUB_TOKEN` ไม่มี space / newline ติดมา
- ลองสร้าง token ใหม่

---

## Original Project History

โปรเจกต์เริ่มต้นพัฒนาด้วย [Lovable.dev](https://lovable.dev/) — โฟลเดอร์ `.lovable/` (gitignored) เก็บ metadata เฉพาะของ platform นั้น

หลังย้ายมา deploy ผ่าน Docker + OpenShift มี config 2 ไฟล์:
- `vite.config.ts` — สำหรับ Lovable.dev (Cloudflare preset)
- `vite.config.docker.ts` — สำหรับ Docker build (Nitro node-server preset)

ถ้าไม่ใช้ Lovable แล้วลบ `vite.config.ts` ทิ้ง และเปลี่ยน script `build` ใน [package.json](package.json) ให้ใช้ docker config:
```json
"build": "vite build --config vite.config.docker.ts"
```

---

## License

Internal project — ติดต่อทีมพัฒนาเรื่องลิขสิทธิ์
