import { eq, inArray } from 'drizzle-orm'
import { db } from '../../database'
import { userTables, userColumns, sessions, users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = parseInt(getRouterParam(event, 'databaseId') as string)
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

    // Get tables for this database
    const tables = await db
      .select()
      .from(userTables)
      .where(eq(userTables.databaseId, databaseId))

    // Get columns for all tables
    const tableIds = tables.map(t => t.id)
    const columns = tableIds.length > 0 
      ? await db
          .select()
          .from(userColumns)
          .where(inArray(userColumns.tableId, tableIds)) // ✅ Gets all tables
      : []

    // Group columns by table
    const tablesWithColumns = tables.map(table => ({
      id: table.id,
      name: table.name,
      x: table.x,
      y: table.y,
      columns: columns
        .filter(col => col.tableId === table.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(col => ({
          name: col.name,
          datatype: col.datatype,
          constraint: col.constraint || 'none',
          isRequired: col.isRequired || false,
          foreignKey: col.foreignKey || undefined 
        }))
    }))

    return { success: true, tables: tablesWithColumns }
    
  } catch (error: any) {
    console.error('Load schema error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load schema'
    })
  }
})