import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../../postgresDB/index'
import { users, sessions } from '../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const { email, username, sessionId } = await readBody(event)

    // Validate input
    if (!username || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and sessionId are required'
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

    const userId = sessionWithUser[0].userId

    // Check if username is taken by another user
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1)
    
    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      return { 
        success: false, 
        message: 'That username is taken',
      }
    }
    //  Check if email is taken by another user
    if (email) {
      const existingEmailUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
      
      if (existingEmailUser.length > 0 && existingEmailUser[0].id !== userId) {
        return { 
          success: false, 
          message: 'That email is already in use',
        }
      }
    }


    // Update user
    const [newUser] = await db.update(users).set({
      email: email || null,
      username
    }).where(eq(users.id, userId)).returning({
      id: users.id,
      email: users.email,
      username: users.username
    })

    return { 
      success: true, 
      user: newUser,
    }
  } catch (error: any) {
    console.error('Sign-up error:', error)

    if (error.statusCode) throw error

    // Handle database constraint errors
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      throw createError({
        statusCode: 409,
        statusMessage: 'Username already exists'
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create user'
    })
  }
})