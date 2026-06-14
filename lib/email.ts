interface SendEmailParams {
  to: string
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log(`[email:noop] to=${to} subject="${subject}"\n${body}`)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'no-reply@padelmanager.app',
      to,
      subject,
      text: body,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.status} ${await response.text()}`)
  }
}
