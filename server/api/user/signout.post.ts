import { eq } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { sessions } from '../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const sessionId = getCookie(event, 'sessionId')
    
    if (sessionId) {
      // Delete session from database
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    }
    
    // Clear the httpOnly cookie
    setCookie(event, 'sessionId', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0 // Expires immediately
    })
    
    return { success: true }
    
  } catch (error) {
    console.error('Signout error:', error)
    
    // Still clear the cookie even if database deletion fails
    setCookie(event, 'sessionId', '', {
      httpOnly: true,
      secure: true, 
      sameSite: 'strict',
      maxAge: 0
    })
    
    return { success: true }
  }
})