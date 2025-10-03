/**
 * GET /api/database/:databaseId/table/impact?tableName=Grocery Cart&sessionId=...
 * Responds with the impact analysis of deleting a table:
 * response = {
 *   tableName: string,
 *   rowCount: number,
 *   success: boolean
 * }
 */

import { eq, count } from 'drizzle-orm'
import { db } from '../../../../postgresDB'
import { userTablePositions, sessions, users } from '../../../../postgresDB/schema'
import path from 'path'
import Database from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const query = getQuery(event)
    const { sessionId, tableName } = query

    if (!sessionId || !tableName || !databaseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, table name, and database ID required'
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

    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )

    // Get table rows
    const sqliteDb = new Database(sqlitePath)
    // Query all user tables (exclude SQLite system tables)
    const rowCount = sqliteDb.prepare(`SELECT COUNT(*) FROM '${tableName}'`)
      .get() as { count: number }

    return { 
      success: true, 
      tableName: tableName,
      rowCount: rowCount.count || 0
    }
    
  } catch (error: any) {
    console.error('Impact analysis error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load table data'
    })
  }
})