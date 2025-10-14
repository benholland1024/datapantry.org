/**
 * POST /api/user/reset-password
 * Body: { token: string, newPassword: string }
 * 
 * This endpoint verifies the reset token, updates the user's password,
 * and invalidates the token after use.
 */

import { db } from '../../postgresDB'
import { users, passwordResetTokens } from '../../postgresDB/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  const { token, newPassword } = await readBody(event)

  if (!token || !newPassword) {
    console.error(' > > Missing token or new password in request')
    throw createError({
      statusCode: 400,
      statusMessage: 'Token and new password are required'
    })
  }

  // Find the reset token in the database
  const [resetTokenRecord] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1)

  if (!resetTokenRecord) {
    console.error(' > > Invalid or expired password reset token:', token)
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired token'
    })
  }

  // Check if the token has expired
  if (resetTokenRecord.expiresAt < new Date()) {
    console.error(' > > Expired password reset token:', token)
    throw createError({
      statusCode: 400,
      statusMessage: 'Token has expired'
    })
  }

  // Hash the new password
  const hashedPassword = await hashPassword(newPassword)

  // Update the user's password
  await db
    .update(users)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, resetTokenRecord.userId))

  // Invalidate the used token by deleting it
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, resetTokenRecord.id))
  console.log(" > > Password reset successful for user ID:", resetTokenRecord.userId)
  return { success: true }
})

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  const salt = await bcrypt.genSalt(saltRounds)
  return bcrypt.hash(password, salt)
}


