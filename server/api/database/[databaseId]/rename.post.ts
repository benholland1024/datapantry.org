/**
 * POST /api/database/[databaseId]/rename
 * Rename a database
 */

import { eq } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { userDatabases, sessions, users } from '../../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const { newName } = await readBody(event)
    const databaseId = event.context.params?.databaseId
    const sessionId = getCookie(event, 'sessionId')

    if (!newName || !sessionId || !databaseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Database name, session ID, and database ID are required'
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

    //  Get the current database
    const [currentDatabase] = await db
      .select()
      .from(userDatabases)
      .where(eq(userDatabases.id, Number(databaseId)))
      .limit(1)

    if (!currentDatabase) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      })
    }

    //  Check if the database belongs to the user
    if (currentDatabase.userId !== sessionWithUser.userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to rename this database'
      })
    }

    //  Update the database name
    const [updatedDatabase] = await db.update(userDatabases)
      .set({ name: newName })
      .where(eq(userDatabases.id, Number(databaseId)))
      .returning({
        id: userDatabases.id,
        name: userDatabases.name,
        createdAt: userDatabases.createdAt,
      })

    return {
      success: true,
      database: {
        ...updatedDatabase,
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