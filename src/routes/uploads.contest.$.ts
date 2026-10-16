import { createFileRoute } from '@tanstack/react-router'
import { readFile, stat, access } from 'fs/promises'
import { join, extname, normalize } from 'path'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
}

function uploadsDirCandidates(): string[] {
  if (process.env.UPLOAD_DIR) return [process.env.UPLOAD_DIR]
  const cwd = process.cwd()
  return [
    join(cwd, 'public', 'uploads'),
    join(cwd, '.output', 'public', 'uploads'),
  ]
}

async function resolveFilePath(subpath: string): Promise<string | null> {
  for (const base of uploadsDirCandidates()) {
    const candidate = normalize(join(base, 'contest', subpath))
    // Prevent path traversal
    if (!candidate.startsWith(normalize(base))) continue
    try {
      await access(candidate)
      return candidate
    } catch {
      // not found, try next
    }
  }
  return null
}

export const Route = createFileRoute('/uploads/contest/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const subpath = (params as any)['$'] as string ?? ''
        if (subpath.includes('..')) return new Response('Not found', { status: 404 })

        const filePath = await resolveFilePath(subpath)
        if (!filePath) return new Response('Not found', { status: 404 })

        try {
          const info = await stat(filePath)
          const ext = extname(filePath).toLowerCase()
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
