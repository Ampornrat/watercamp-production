export async function sendLineNotify(message: string): Promise<void> {
  const token = process.env.LINE_NOTIFY_TOKEN
  if (!token) return

  try {
    const body = new URLSearchParams({ message })
    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
  } catch {
    // fire-and-forget — ไม่ให้ LINE error กระทบ flow หลัก
  }
}
