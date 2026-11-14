import { createFileRoute } from '@tanstack/react-router'
import { createHmac } from 'crypto'

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

        const buffer = Buffer.from(await request.arrayBuffer())
        const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream'

        const { uploadToR2 } = await import('@/lib/r2.server')
        await uploadToR2(buffer, path, contentType)

        return new Response(null, { status: 200 })
      },
    },
  },
})
