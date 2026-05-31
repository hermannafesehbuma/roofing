export type EmailOptions = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Mock email function since no provider is set up yet
  console.log('================= MOCK EMAIL SENT =================')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Body HTML length: ${html.length}`)
  console.log('===================================================')
  
  // In a real implementation:
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from: 'noreply@roofing.com', to, subject, html })
}
