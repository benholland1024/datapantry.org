import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../../database'
import { users, sessions } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const { username, password } = await readBody(event)

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and password are required'
      })
    }

    // Find user by username
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid username or password'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid username or password'
      })
    }

    // Create new session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    })

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user

    return { 
      success: true, 
      user: userWithoutPassword,
      sessionId 
    }
    
  } catch (error: any) {
    console.error('Sign-in error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Sign-in failed'
    })
  }
})