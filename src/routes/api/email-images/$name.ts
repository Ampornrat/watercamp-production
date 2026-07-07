import { createFileRoute } from '@tanstack/react-router'
import { readFileSync } from 'fs'
import { join } from 'path'

const ALLOWED: Record<string, string> = {
  'qr-line-openchat.jpg': 'image/jpeg',
  'banner-appstore.png': 'image/png',
  'banner-googleplay.png': 'image/png',
}

export const Route = createFileRoute('/api/email-images/$name')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const contentType = ALLOWED[params.name]
        if (!contentType) return new Response('Not found', { status: 404 })

        try {
          const filePath = join(process.cwd(), 'public', 'email-images', params.name)
          const file = readFileSync(filePath)
          return new Response(file, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch {
          return new Response('Not found', { status: 404 })
        }
      },
    },
  },
})
