import { createFileRoute } from '@tanstack/react-router'
import { readFile, stat, access } from 'fs/promises'
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

// Candidate directories searched in order until the file is found
function uploadsDirCandidates(): string[] {
  if (process.env.UPLOAD_DIR) return [process.env.UPLOAD_DIR]
  const cwd = process.cwd()
  return [
    join(cwd, 'public', 'uploads'),                  // git-tracked static assets (always present)
    join(cwd, '.output', 'public', 'uploads'),        // Vinxi production build copy
  ]
}

async function resolveFilePath(name: string): Promise<string | null> {
  for (const dir of uploadsDirCandidates()) {
    const candidate = join(dir, name)
    try {
      await access(candidate)
      return candidate
    } catch {
      // not found in this directory, try next
    }
  }
  return null
}

export const Route = createFileRoute('/uploads/$name')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Reject any path traversal attempts
        if (/[/\\]/.test(params.name) || params.name.includes('..')) {
          return new Response('Not found', { status: 404 })
        }

        const filePath = await resolveFilePath(params.name)
        if (!filePath) return new Response('Not found', { status: 404 })

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
