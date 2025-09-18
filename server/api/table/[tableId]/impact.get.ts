/**
 * GET /api/table/:tableId/impact
 * Responds with the impact analysis of deleting a table:
 * response = {
 *   tableId: string,
 *   tableName: string,
 *   rowCount: number,
 *   sampleData: [...],
 *   success: boolean
 * }
 */

import { eq, count } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { userTables, userColumns, rows, sessions, users } from '../../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const tableId = getRouterParam(event, 'tableId') as string
    const query = getQuery(event)
    const { sessionId } = query

    if (!sessionId || !tableId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID and table ID required'
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

    // Get the table name
    const [table] = await db
      .select({ name: userTables.name })
      .from(userTables)
      .where(eq(userTables.id, tableId))
      .limit(1)

    if (!table) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found'
      })
    }

    // Get table rows
    const tableRowCount = await db
      .select({ count: count() })
      .from(rows)
      .where(eq(rows.tableId, tableId))

    
    // Get a sample of rows (up to 5)
    const formattedRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .limit(5)

    return { 
      success: true, 
      tableId: tableId,
      tableName: table.name,
      rowCount: tableRowCount[0]?.count || 0
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