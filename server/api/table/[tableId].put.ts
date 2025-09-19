/**
 * PUT /api/table/:tableId?sessionId=...
 * Updates a table and table columns. 
 * Can be passed a "preserveData" flag to keep or delete existing rows. 
 * Body: { columns: [...], preserveData: boolean }
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
    const tableId = getRouterParam(event, 'tableId') as string
    const { columns, columnChanges, preserveData } = await readBody(event)

    console.log('Received schema update:', { tableId, columns, preserveData })

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

    //  Get existing column IDs
    const existingColumns = await db
      .select({ id: userColumns.id })
      .from(userColumns)
      .where(eq(userColumns.tableId, tableId))
    console.log(' > Existing columns:', existingColumns.length)
    const existingColumnIds = existingColumns.map(c => c.id)
    const incomingColumnIds = columns.filter((c: any) => c.id).map((c: any) => c.id)

    //  Get existing rows that reference this table
    const existingRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId))

    // 1. If we're not preserving data, delete all existing rows.
    if (!preserveData) {
      // Delete all rows that reference this table
      if (existingRows.length > 0) {
        await db
          .delete(rows)
          .where(eq(rows.tableId, tableId))
      }
      
    } // If we are preserving data, rows will be modified to match columns (but all will be kept)

    //  2. Delete all columns that are not in the incoming set
    const columnsToDelete = existingColumnIds.filter(id => !incomingColumnIds.includes(id))
    if (columnsToDelete.length > 0) {
      console.log(' > Deleting columns:', columnsToDelete.length)
      await db
        .delete(userColumns)
        .where(inArray(userColumns.id, columnsToDelete))
    }

    // 3. Insert or update incoming columns
    for (const column of columns) {
      console.log(' > Processing column:', column.name, column.id ? `(id: ${column.id})` : '(new)')
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
        console.log('   - Updated column:', column.name)
      } else {
        // Insert new column
        await db
          .insert(userColumns)
          .values({
            id: column.id,
            tableId: tableId,
            name: column.name,
            datatype: column.datatype,
            isRequired: column.isRequired,
            constraint: column.constraint,
            orderIndex: 100, // TODO: determine order
          })
        console.log('   - Inserting new column:', column.name)
      }
    }

    // 4. If preserving data, update existing rows to match new columns. TODO. 
    // if (preserveData) {
    //   // 4.1. Analyze changes
    //   //const { deletedColumns, renamedColumns, datatypeChanges, addedColumns, constraintChanges, isRequiredChanges } = analyzeColumnDiffs(oldColumns, newColumns);
    //   const deletedColumns = columnChanges.filter((c: any) => c.type === 'delete').map((c: any) => c.name)
    //   const renamedColumns = columnChanges.filter((c: any) => c.type === 'rename').map((c: any) => ({ oldName: c.oldName, newName: c.newName }))
    //   const datatypeChanges = columnChanges.filter((c: any) => c.type === 'datatype').map((c: any) => ({ column: c.name, oldType: c.oldType, newType: c.newType }))
    //   const addedColumns = columnChanges.filter((c: any) => c.type === 'add').map((c: any) => ({ name: c.name, datatype: c.datatype, isRequired: c.isRequired }))
    //   const constraintChanges = columnChanges.filter((c: any) => c.type === 'constraint').map((c: any) => ({ column: c.name, constraint: c.constraint }))
    //   const isRequiredChanges = columnChanges.filter((c: any) => c.type === 'isRequired').map((c: any) => ({ column: c.name, isRequired: c.isRequired }))

    //   // 4.2. Transform rows
    //   let updatedRows = existingRows.map(row => {
    //     let data = { ...row.data }
    //     data = applyColumnDeletions(data, deletedColumns)
    //     data = applyColumnRenames(data, renamedColumns)
    //     data = applyDatatypeChanges(data, datatypeChanges)
    //     data = applyColumnAdditions(data, addedColumns)
    //     data = applyIsRequiredChanges(data, isRequiredChanges)
    //     return { ...row, data }
    //   })

    //   // 4.3. Apply constraint changes (may need to look at all rows at once)
    //   updatedRows = applyConstraintChanges(updatedRows, constraintChanges)

    //   // 4.4. Batch update
    //   for (const row of updatedRows) {
    //     await db.update(rows).set({ data: row.data }).where(eq(rows.id, row.id))
    //   }
    // }

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

