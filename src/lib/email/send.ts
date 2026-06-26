interface SendTransactionalEmailParams {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, any>
}

export async function sendTransactionalEmail(params: SendTransactionalEmailParams) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const response = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      templateName: params.templateName,
      recipientEmail: params.recipientEmail,
      idempotencyKey: params.idempotencyKey,
      templateData: params.templateData,
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Failed to send email (${response.status}): ${text}`)
  }
  return response.json()
}
