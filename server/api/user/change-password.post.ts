import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../../postgresDB/index'
import { users, sessions } from '../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const { oldPassword, newPassword } = await readBody(event)
    const sessionId = getCookie(event, 'sessionId')

    // Validate input
    if (!oldPassword || !newPassword || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Old password, new password, and sessionId are required'
      })
    }

    // Validate session ID
    const sessionWithUser = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!sessionWithUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid session'
      })
    }

    //  Check old password
    const [user] = await db.select().from(users).where(eq(users.id, sessionWithUser[0].userId)).limit(1)

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    const passwordMatches = await bcrypt.compare(oldPassword, user.password)

    if (!passwordMatches) {
      return { 
        success: false, 
        message: 'Old password is incorrect',
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password in database
    await db.update(users).set({
      password: hashedPassword
    }).where(eq(users.id, user.id))

    return { success: true }
  } catch (error: any) {
    console.error('Change password error:', error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to change password'
    })
  }
})