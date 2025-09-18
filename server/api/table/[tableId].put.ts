/**
 * PUT /api/table/:tableId?sessionId=...
 * Updates a table and table columns. 
 * Can be passed a "preserveData" flag to keep or delete existing rows. 
 * Body: { tables: Array, preserveData: boolean }
 */

import { eq, inArray } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { 
  userTables, 
  userColumns, 
  sessions, 
  users, 
  rows
 } from '../../postgresDB/schema'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    const tableId = parseInt(getRouterParam(event, 'tableId') as string)
    const { columns, preserveData } = await readBody(event)

    const sessionId = getQuery(event).sessionId as string
    
    if (!sessionId || !tableId || !columns) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, table ID, and columns required'
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

    console.log(typeof tableId); // should be "string"
    console.log(tableId); // should be the correct tableId value

    //  Get existing column IDs
    const existingColumns = await db
      .select({ id: userColumns.id })
      .from(userColumns)
      .where(eq(userColumns.tableId, tableId.toString()))
    const existingColumnIds = existingColumns.map(c => c.id)
    const incomingColumnIds = columns.filter((c: any) => c.id).map((c: any) => c.id)

    //  Get existing rows that reference this table
    const existingRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId.toString()))

    // Delete in the correct order: rows -> columns -> tables
    if (!preserveData) {
      // First: Delete all rows that reference this table
      if (existingRows.length > 0) {
        await db
          .delete(rows)
          .where(eq(rows.tableId, tableId.toString()))
      }
      
      // Second: Delete all columns that are not in the incoming set
      const columnsToDelete = existingColumnIds.filter(id => !incomingColumnIds.includes(id))
      if (columnsToDelete.length > 0) {
        await db
          .delete(userColumns)
          .where(inArray(userColumns.id, columnsToDelete))
      }
    } else {
      // If preserving data, only delete columns that are being removed
      const columnsToDelete = existingColumnIds.filter(id => !incomingColumnIds.includes(id))
      if (columnsToDelete.length > 0) {
        await db
          .delete(userColumns)
          .where(inArray(userColumns.id, columnsToDelete))
      }
    }

    // Upsert incoming columns
    for (const column of columns) {
      if (column.id && existingColumnIds.includes(column.id)) {
        // Update existing column
        await db
          .update(userColumns)
          .set({
            name: column.name,
            datatype: column.datatype,
            isRequired: column.isRequired,
            constraint: column.constraint,
          })
          .where(eq(userColumns.id, column.id))
      } else {
        // Insert new column
        await db
          .insert(userColumns)
      }
    }

    return { success: true }
    
  } catch (error: any) {
    console.error('Save schema error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save schema'
    })
  }
})