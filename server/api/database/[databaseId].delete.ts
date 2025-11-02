/**
 * DELETE /api/database/:databaseId
 * 
 * Delete a database and all its associated tables and rows.
 * Requires a valid session ID for authentication.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { 
  userDatabases,
  userTablePositions,
  sessions, 
  users 
} from '../../postgresDB/schema'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const query = getQuery(event)
    const sessionId = getCookie(event, 'sessionId')
    
    if (!sessionId || !databaseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID and database ID required'
      })
    }

    // Validate session
    const [sessionWithUser] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId as string))
      .limit(1)

    if (!sessionWithUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid session'
      })
    }

    // Verify the database exists and belongs to the user
    const [database] = await db
      .select({ id: userDatabases.id })
      .from(userDatabases)
      .where(
        and(
          eq(userDatabases.id, Number(databaseId)),
          eq(userDatabases.userId, sessionWithUser.userId)
        )
      )
      .limit(1)

    if (!database) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      })
    }

    // Delete the SQLite file
    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )
    // Check if file exists before trying to delete
    if (fs.existsSync(sqlitePath)) {
      fs.unlinkSync(sqlitePath)
    }

    // Delete all userTablePositions associated with the database
    await db
      .delete(userTablePositions)
      .where(eq(userTablePositions.databaseId, Number(databaseId)))

    // Delete the database itself
    await db
      .delete(userDatabases)
      .where(eq(userDatabases.id, Number(databaseId)))

    return { success: true }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete database'
    })
  }
})