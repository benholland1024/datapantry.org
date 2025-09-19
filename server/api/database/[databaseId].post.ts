/**
 * POST /api/database/:databaseId
 * Saves the schema (table names + x and y positions) for a specific database.
 * 
 * If table columns changed, don't use this, use:
 *  -  GET /api/table/:tableId/impact to get # rows affected, col differences, etc
 *  -  PUT /api/table/:tableId , using the preserveData flag if needed
 * 
 * If tables are being deleted, use:
 *  -  GET /api/table/:tableId/impact 
 *  -  DELETE /api/table/:tableId
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
    const databaseId = parseInt(getRouterParam(event, 'databaseId') as string)
    const { tables, sessionId } = await readBody(event)

    if (!sessionId || !databaseId || !tables) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, database ID, and tables required'
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

    //  Get existing table IDs
    const existingTables = await db
      .select({ id: userTables.id })
      .from(userTables)
      .where(eq(userTables.databaseId, databaseId))
    const existingTableIds = <Array<string>> existingTables.map(t => t.id)
    console.log(' > Existing table ids:', existingTableIds)

    //  Get existing rows that reference these tables
    const existingRows = await db
      .select()
      .from(rows)
      .where(inArray(rows.tableId, existingTableIds))

    //  Get existing columns that reference these tables
    const existingColumns = await db
      .select()
      .from(userColumns)
      .where(inArray(userColumns.tableId, existingTableIds))

    // Delete in the correct order: rows -> columns -> tables
    if (existingTableIds.length > 0) {
      // First: Delete all rows that reference these tables
      await db
        .delete(rows)
        .where(inArray(rows.tableId, existingTableIds))
      
      // Second: Delete columns 
      await db
        .delete(userColumns)
        .where(inArray(userColumns.tableId, existingTableIds))
    }

    // Clear existing tables for this database (before saving new ones)
    await db.delete(userTables).where(eq(userTables.databaseId, databaseId))


    // Save new tables
    for (const table of tables) {
      const [savedTable] = await db
        .insert(userTables)
        .values({
          id: table.id,
          databaseId,
          name: table.name,
          x: table.x,
          y: table.y,
        })
        .returning({ id: userTables.id })

      //  Iff the table is new, save NEW columns. This applies to the "default" column.
      if (!existingTableIds.includes(table.id) && table.columns && table.columns.length > 0) {
        const columnValues = table.columns.map((col: any, index: number) => ({
          id: table.columns[0].id,
          tableId: table.id,
          name: col.name,
          datatype: col.datatype,
          constraint: col.constraint || 'none',
          isRequired: col.isRequired || false,
          orderIndex: index,
          foreignKey: col.foreignKey || null 
        }))

        await db.insert(userColumns).values(columnValues)
      } 

      else if (existingTableIds.includes(table.id) && table.columns && table.columns.length > 0) {
        // If the table existed before, we need to re-save existing columns that were not deleted.
        const columnsToReinsert = existingColumns.filter(c => c.tableId === table.id)
        if (columnsToReinsert.length > 0) {
          await db.insert(userColumns).values(columnsToReinsert)
        }
      }
    }

    // Save rows
    if (existingRows.length > 0) {
      await db.insert(rows).values(existingRows)
    }


    // After saving all tables, return the updated schema
    const savedTables = await db
    .select()
    .from(userTables)
    .where(eq(userTables.databaseId, databaseId))

    // Get columns for all saved tables
    const savedColumns = await db
    .select()
    .from(userColumns)
    .where(inArray(userColumns.tableId, savedTables.map(t => t.id)))

    // Build the response similar to the GET endpoint
    const tablesWithColumns = savedTables.map(table => ({
      id: table.id,
      name: table.name,
      x: table.x,
      y: table.y,
      columns: savedColumns
        .filter(col => col.tableId === table.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(col => ({
          name: col.name,
          datatype: col.datatype,
          constraint: col.constraint || 'none',
          isRequired: col.isRequired || false,
          foreignKey: col.foreignKey
        }))
    }))

    return { success: true, tables: tablesWithColumns }
    
  } catch (error: any) {
    console.error('Save schema error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save schema'
    })
  }
})