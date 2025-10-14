import { eq, gt } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { sessions, users } from '../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const { sessionId } = await readBody(event)

    if (!sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID required'
      })
    }

    // Find valid session with user data
    const [sessionWithUser] = await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
        }
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!sessionWithUser || new Date() > sessionWithUser.expiresAt) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired session'
      })
    }

    return { 
      success: true, 
      user: sessionWithUser.user 
    }
    
  } catch (error: any) {
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Session validation failed'
    })
  }
})