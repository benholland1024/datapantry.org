import { Resend } from 'resend'
import crypto from 'crypto'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { users, passwordResetTokens, passwordResetRequestIPs } from '../../postgresDB/schema'

// Simple getClientIP implementation for Nitro event
function getClientIP(event: any): string {
  return event.node.req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.node.req.socket.remoteAddress ||
         ''
}

const resend = new Resend(process.env.RESEND_API_KEY)

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)

  // Rate limiting: Check for recent requests from this IP
  const clientIP = getClientIP(event)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  const recentRequest = await db
    .select()
    .from(passwordResetRequestIPs)
    .where(and(
      eq(passwordResetRequestIPs.ipAddress, clientIP),
      gt(passwordResetRequestIPs.createdAt, fiveMinutesAgo)
    ))
    .limit(1)

  if (recentRequest.length > 0) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests from this IP, please try again later'
    })
  }
  

  // Generate reset token and save to database
  const resetToken = crypto.randomUUID()

  // ... save token to database with expiry ...
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) {
    // To prevent user enumeration, respond with success even if user not found
    console.log(' > > Password reset requested for non-existent email:', email)
    return { success: true }
  }

  const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour from now

  await db
    .insert(passwordResetTokens)
    .values({
      userId: user.id,
      token: resetToken,
      expiresAt
    })

  // Send reset email
  
  const isInDevelopment = process.env.NODE_ENV === 'development'
  const baseUrl = isInDevelopment ? 'http://localhost:3000' : 'https://datapantry.org'
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`
  console.log(' > > Sending a password reset email to:', email)
  await resend.emails.send({
    from: 'noreply@datapantry.org',
    to: email,
    subject: 'Reset your DataPantry password',
    html: `
      <h1>Reset Your DataPantry Password &#x1F96B;</h1>
      <p>Click this link to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p><small>If you didn't request a password reset, you can safely ignore this email.</small></p>

    `
  })
  
  return { success: true }
})