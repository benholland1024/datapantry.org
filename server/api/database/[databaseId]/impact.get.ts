/**
 * GET /api/database/[databaseId]/impact
 * 
 * Get the impact of deleting a database, 
 * including the number of tables and rows that would be deleted.
 */

import { eq, count } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { databases, userTables, rows, sessions, users } from '../../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const query = getQuery(event)
    const { sessionId } = query

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

    // Get the database name
    const [database] = await db
      .select({ name: databases.name })
      .from(databases)
      .where(eq(databases.id, Number(databaseId)))
      .limit(1)

    if (!database) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      })
    }

    // Get number of tables in the database
    const tableCountResult = await db
      .select({ count: count() })
      .from(userTables)
      .where(eq(userTables.databaseId, Number(databaseId)))

    const tableCount = tableCountResult[0]?.count || 0

    // Get number of rows across all tables in the database
    let totalRowCount = 0
    if (tableCount > 0) {
      const tables = await db
        .select({ id: userTables.id })
        .from(userTables)
        .where(eq(userTables.databaseId, Number(databaseId)))

      for (const table of tables) {
        const rowCountResult = await db
          .select({ count: count() })
          .from(rows)
          .where(eq(rows.tableId, table.id))
        
        totalRowCount += rowCountResult[0]?.count || 0
      }
    }

    return { 
      success: true, 
      databaseId: databaseId,
      databaseName: database.name,
      tableCount: tableCount,
      totalRowCount: totalRowCount
    }
    
  } catch (error: any) {
    console.error('Impact analysis error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load database impact data'
    })
  }
})