import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  const transporter = createTransport()
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
}
