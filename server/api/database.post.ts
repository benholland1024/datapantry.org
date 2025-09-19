/**
 * POST /api/database?sessionId=...
 * Create a new database for the authenticated user.
 * Expects: { name: string, sessionId: string }
 * Returns: { success: boolean, database: { id, name, createdAt, tables: [] } }
 */

import { eq } from 'drizzle-orm'
import { db } from '../postgresDB'
import { databases, sessions, users } from '../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const { name, sessionId } = await readBody(event)

    if (!name || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Database name and session ID are required'
      })
    }

    // Validate session and get user
    const [sessionWithUser] = await db
      .select({
        userId: sessions.userId,
        user: {
          id: users.id,
          username: users.username,
        }
      })
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

    // Create the database
    const [newDatabase] = await db.insert(databases).values({
      name,
      userId: sessionWithUser.userId,
    }).returning({
      id: databases.id,
      name: databases.name,
      createdAt: databases.createdAt,
    })

    return { 
      success: true, 
      database: {
        ...newDatabase,
        tables: [] // New database has no tables yet
      }
    }
    
  } catch (error: any) {
    console.error('Create database error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create database'
    })
  }
})