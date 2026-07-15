import { createFileRoute } from '@tanstack/react-router'
import { readFile, stat } from 'fs/promises'
import { join, extname } from 'path'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
}

function uploadsDir() {
  return (
    process.env.UPLOAD_DIR ??
    (process.env.NODE_ENV === 'production'
      ? join(process.cwd(), '.output', 'public', 'uploads')
      : join(process.cwd(), 'public', 'uploads'))
  )
}

export const Route = createFileRoute('/uploads/$name')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Reject any path traversal attempts
        if (/[/\\]/.test(params.name) || params.name.includes('..')) {
          return new Response('Not found', { status: 404 })
        }

        const filePath = join(uploadsDir(), params.name)

        try {
          const info = await stat(filePath)
          const ext = extname(params.name).toLowerCase()
          const contentType = MIME[ext] ?? 'application/octet-stream'
          const buffer = await readFile(filePath)

          return new Response(buffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Length': String(info.size),
              'Cache-Control': 'public, max-age=86400, must-revalidate',
            },
          })
        } catch {
          return new Response('Not found', { status: 404 })
        }
      },
    },
  },
})
