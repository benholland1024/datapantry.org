import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../../postgresDB/index'
import { users, sessions } from '../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const { email, password, username } = await readBody(event)

    // Validate input
    if (!username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and password are required'
      })
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1)
    
    if (existingUser.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User already exists'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const [newUser] = await db.insert(users).values({
      email: email || null,
      password: hashedPassword,
      username
    }).returning({
      id: users.id,
      email: users.email,
      username: users.username
    })
    
    // Create session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.insert(sessions).values({
      id: sessionId,
      userId: newUser.id,
      expiresAt,
    })

    // Set httpOnly cookie
    setCookie(event, 'sessionId', sessionId, {
      httpOnly: true,        // JavaScript cannot access this cookie
      secure: true,          // Only sent over HTTPS
      sameSite: 'strict',    // CSRF protection
      maxAge: 7 * 24 * 60 * 60 // 7 days
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