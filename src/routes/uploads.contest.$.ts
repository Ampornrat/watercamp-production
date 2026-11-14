import { createFileRoute } from '@tanstack/react-router'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { extname } from 'path'

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

export const Route = createFileRoute('/uploads/contest/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const subpath = (params as any)._splat as string ?? ''
        if (subpath.includes('..')) return new Response('Not found', { status: 404 })

        const accountId = process.env.R2_ACCOUNT_ID
        const bucket = process.env.R2_BUCKET
        if (!accountId || !bucket) return new Response('Storage not configured', { status: 500 })

        const client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        })

        try {
          const key = `contest/${subpath}`
          const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
          const body = await res.Body?.transformToByteArray()
          if (!body) return new Response('Not found', { status: 404 })

          const ext = extname(subpath).toLowerCase()
          const contentType = MIME[ext] ?? res.ContentType ?? 'application/octet-stream'

          return new Response(body, {
            headers: {
              'Content-Type': contentType,
              'Content-Length': String(res.ContentLength ?? body.length),
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
