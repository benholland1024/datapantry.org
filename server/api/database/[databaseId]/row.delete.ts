/**
 * Delete a row from a table.
 * 
 * DELETE /api/table/:tableId/row/:rowId
 * 
 * Parameters:
 * - sessionId: string (required)
 * - tableId: string (from URL, required)
 * - rowId: string (from URL, required)
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { sessions, users } from '../../../postgresDB/schema'
import Database from 'better-sqlite3'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const { sessionId, rowPK, pkColumn, tableName } = await readBody(event)

    if (!sessionId || !databaseId || !rowPK || !pkColumn || !tableName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, database ID, table name, row PK, and PK column required'
      })
    }

    // Validate session
    const [sessionWithUser] = await db
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

    // Delete row
    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )
    const sqliteDb = new Database(sqlitePath)
    const deleteStmt = sqliteDb.prepare(`DELETE FROM '${tableName}' WHERE ${pkColumn} = ?`)
    const result = deleteStmt.run(rowPK)

    if (result.changes === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Row not found'
      })
    }

    return { success: true }
    
  } catch (error: any) {
    console.error('Delete row error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete row'
    })
  }
})