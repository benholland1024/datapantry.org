/**
 * GET /api/table/:tableId
 * Responds with a table, its columns, and its rows.
 * 
 */

import { eq } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { userTables, userColumns, rows, sessions, users } from '../../postgresDB/schema'

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

    // Get table structure
    const [table] = await db
      .select()
      .from(userTables)
      .where(eq(userTables.id, tableId))
      .limit(1)

    if (!table) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found'
      })
    }

    // Get table columns
    const columns = await db
      .select()
      .from(userColumns)
      .where(eq(userColumns.tableId, tableId))
      .orderBy(userColumns.orderIndex)

    // Get table rows
    const tableRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId))

    // Format the response
    const tableWithData = {
      id: table.id,
      name: table.name,
      columns: columns.map(col => ({
        name: col.name,
        datatype: col.datatype,
        constraint: col.constraint || 'none',
        isRequired: col.isRequired || false,
        foreignKey: col.foreignKey
      }))
    }

    const formattedRows = tableRows.map(row => {
      
      // Extract the data but exclude any 'id' field from the JSON data
      const { id: dataId, ...cleanData } = row.data || {}
      
      return {
        id: row.id,      // Use the real UUID from the database
        ...cleanData     // Spread everything except the id from data
      }
    })

    return { 
      success: true, 
      table: tableWithData,
      rows: formattedRows
    }
    
  } catch (error: any) {
    console.error('Load table data error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load table data'
    })
  }
})