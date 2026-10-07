import { createFileRoute } from '@tanstack/react-router'
import { createHmac } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'

export const Route = createFileRoute('/api/contest/upload')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const url = new URL(request.url)
        const path = url.searchParams.get('path')
        const expires = Number(url.searchParams.get('expires'))
        const sig = url.searchParams.get('sig')

        if (!path || !expires || !sig) {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }

        if (Date.now() > expires) {
          return Response.json({ error: 'URL หมดอายุ กรุณาลองใหม่' }, { status: 410 })
        }

        if (!/^contest\/[\w-]+\/\d+-[\w.\- ]+$/.test(path)) {
          return Response.json({ error: 'Invalid path' }, { status: 400 })
        }

        const secret = process.env.DB_PASSWORD ?? 'watercamp-upload'
        const expected = createHmac('sha256', secret)
          .update(`${path}:${expires}`)
          .digest('hex')

        if (sig !== expected) {
          return Response.json({ error: 'Invalid signature' }, { status: 403 })
        }

        const uploadsBase = process.env.UPLOAD_DIR
          ?? (process.env.NODE_ENV === 'production'
            ? join(process.cwd(), '.output', 'public', 'uploads')
            : join(process.cwd(), 'public', 'uploads'))

        const fullPath = join(uploadsBase, path)
        if (!fullPath.startsWith(uploadsBase)) {
          return Response.json({ error: 'Invalid path' }, { status: 400 })
        }

        await mkdir(dirname(fullPath), { recursive: true })
        const buffer = Buffer.from(await request.arrayBuffer())
        await writeFile(fullPath, buffer)

        return new Response(null, { status: 200 })
      },
    },
  },
})
