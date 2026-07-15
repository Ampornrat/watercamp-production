import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import pool from '@/lib/db.server'

const BUCKET = 'uploads'

function getStorageClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return createClient(url, key)
}

export const Route = createFileRoute('/api/admin/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookieHeader = request.headers.get('cookie') ?? ''
        const sessionId = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/)?.[1]
        if (!sessionId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

        const [rows] = await (pool as any).query(
          `SELECT u.role FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = 1`,
          [sessionId],
        ) as [Array<{ role: string }>]
        if (!rows[0] || rows[0].role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        let formData: FormData
        try {
          formData = await request.formData()
        } catch {
          return Response.json({ error: 'Invalid form data' }, { status: 400 })
        }

        const file = formData.get('file') as File | null
        if (!file || !file.name) return Response.json({ error: 'No file provided' }, { status: 400 })

        const MAX_SIZE = 50 * 1024 * 1024
        if (file.size > MAX_SIZE) return Response.json({ error: 'ไฟล์ต้องไม่เกิน 50MB' }, { status: 400 })

        const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
        const buffer = Buffer.from(await file.arrayBuffer())

        let supabase: ReturnType<typeof createClient>
        try {
          supabase = getStorageClient()
        } catch {
          return Response.json({ error: 'Storage not configured' }, { status: 500 })
        }

        const { error } = await supabase.storage.from(BUCKET).upload(safeName, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

        if (error) {
          console.error('Supabase Storage upload error:', error)
          return Response.json({ error: 'อัปโหลดไฟล์ไม่สำเร็จ' }, { status: 500 })
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(safeName)

        return Response.json({ url: publicUrl, name: file.name })
      },
    },
  },
})
