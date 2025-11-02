/**
 * Delete multiple rows from a table.
 *
 * DELETE /api/database/:databaseId/rows
 *
 * Parameters:
 * - databaseId: string (from URL, required)
 * - rowPKs: string[] (from URL, required)
 * - pkColumn: string (from body, required)
 * - tableName: string (from body, required)
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { sessions, users } from '../../../postgresDB/schema'
import Database from 'better-sqlite3'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const { 
      rowPKs,
      pkColumn,
      tableName
    } = await readBody(event)
    const sessionId = getCookie(event, 'sessionId')

    if (!sessionId ||
        !databaseId ||
        !rowPKs || 
        !Array.isArray(rowPKs) || rowPKs.length === 0 || 
        !pkColumn || 
        !tableName 
      ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, database ID, table name, primary key column, and row PKs required'
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

    // Get SQLite DB 
    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )
    const sqliteDb = new Database(sqlitePath)

    // Delete each row
    for (const rowPK of rowPKs) {
      const deleteStmt = sqliteDb.prepare(`DELETE FROM '${tableName}' WHERE ${pkColumn} = ?`)
      const result = deleteStmt.run(rowPK)

      if (result.changes === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Row not found'
        })
      }
    }

    return { success: true }

  } catch (error: any) {
    console.error('Delete rows error:', error)

    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete rows'
    })
  }
})