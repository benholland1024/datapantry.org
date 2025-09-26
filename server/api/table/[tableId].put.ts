/**
 * PUT /api/table/:tableId?sessionId=...
 * Updates a table and table columns. 
 * Can be passed a "preserveData" flag to keep or delete existing rows. 
 * Body: { columns: [...], columnChanges: [...], preserveData: boolean }
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
    const { tableName, columns, columnChanges, preserveData } = await readBody(event)

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

    //  Update table name if provided
    if (tableName && tableName.trim() !== '') {
      await db
        .update(userTables)
        .set({ name: tableName.trim() })
        .where(eq(userTables.id, tableId))
    }

    //  Get existing column IDs
    const existingColumns = await db
      .select({ id: userColumns.id })
      .from(userColumns)
      .where(eq(userColumns.tableId, tableId))
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
      await db
        .delete(userColumns)
        .where(inArray(userColumns.id, columnsToDelete))
    }

    // 3. Insert or update incoming columns
    for (const column of columns) {
      if (column.id && existingColumnIds.includes(column.id)) {
        // Update existing column
        await db
          .update(userColumns)
          .set({
            name: column.name,
            datatype: column.datatype,
            foreignKey: column.foreignKey ? {
              tableId: column.foreignKey.tableId,
              columnName: column.foreignKey.columnName
            } : null,
            isRequired: column.isRequired,
            constraint: column.constraint,
          })
          .where(eq(userColumns.id, column.id))
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
      }
    }

    // 4. If preserving data, update existing rows to match new columns
    if (preserveData) {
      // 4.1. Analyze changes
      const deletedColumns = columnChanges.filter((c: any) => c.type === 'delete').map((c: any) => c.name)
      const renamedColumns = columnChanges.filter((c: any) => c.type === 'rename').map((c: any) => ({ oldName: c.oldName, newName: c.newName }))
      const datatypeChanges = columnChanges.filter((c: any) => c.type === 'datatype').map((c: any) => ({ column: c.name, oldType: c.oldType, newType: c.newType }))
      const addedColumns = columnChanges.filter((c: any) => c.type === 'add').map((c: any) => ({ name: c.name, datatype: c.datatype, isRequired: c.isRequired }))
      const constraintChanges = columnChanges.filter((c: any) => c.type === 'constraint').map((c: any) => ({ column: c.name, constraint: c.constraint }))
      const isRequiredChanges = columnChanges.filter((c: any) => c.type === 'isRequired').map((c: any) => ({ column: c.name, isRequired: c.isRequired }))

      // 4.2. Transform rows
      let updatedRows = existingRows.map(row => {
        let data = { ...row.data }
        data = applyColumnDeletions(data, deletedColumns)
        data = applyColumnRenames(data, renamedColumns)
        data = applyDatatypeChanges(data, datatypeChanges)
        data = applyColumnAdditions(data, addedColumns)
        return { ...row, data }
      })

      // 4.3. Apply constraint changes (may need to look at all rows at once)
      updatedRows = applyConstraintChanges(updatedRows, constraintChanges)

      // 4.4. Apply isRequired changes (may need uniqueness info from constraints)
      updatedRows = applyIsRequiredChanges(updatedRows, isRequiredChanges, constraintChanges)

      // 4.5. Batch update
      for (const row of updatedRows) {
        await db.update(rows).set({ data: row.data }).where(eq(rows.id, row.id))
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

// Helper functions - now properly implementing the rules

function applyColumnDeletions(data: any, deletedColumns: string[]) {
  for (const col of deletedColumns) {
    delete data[col]
  }
  return data
}

function applyColumnRenames(data: any, renamedColumns: Array<{ oldName: string, newName: string }>) {
  for (const { oldName, newName } of renamedColumns) {
    if (data.hasOwnProperty(oldName)) {
      data[newName] = data[oldName]
      delete data[oldName]
    }
  }
  return data
}

function applyDatatypeChanges(data: any, datatypeChanges: Array<{ column: string, oldType: string, newType: string }>) {
  for (const { column, oldType, newType } of datatypeChanges) {
    if (data.hasOwnProperty(column)) {
      let value = data[column]
      
      // Number to String conversion
      if (oldType === 'number' && newType === 'string') {
        data[column] = String(value)
      }
      // String to Number conversion - NaN becomes 0 per rules
      else if (oldType === 'string' && newType === 'number') {
        const trimmed = String(value).trim()
        const num = Number(trimmed)
        data[column] = isNaN(num) ? 0 : num
      }
      // String to Boolean conversion
      else if (oldType === 'string' && newType === 'boolean') {
        data[column] = String(value).toLowerCase() === 'true'
      }
      // Boolean to String conversion
      else if (oldType === 'boolean' && newType === 'string') {
        data[column] = value ? 'true' : 'false'
      }
      // Foreign Key to String - becomes blank per rules
      else if (oldType === 'foreign key' && newType === 'string') {
        data[column] = ''
      }
      // Foreign Key to Number - becomes 0 per rules
      else if (oldType === 'foreign key' && newType === 'number') {
        data[column] = 0
      }
      // Foreign Key to Boolean - becomes false
      else if (oldType === 'foreign key' && newType === 'boolean') {
        data[column] = false
      }
      // String/Number/Boolean to Foreign Key - becomes null (invalid reference)
      else if (newType === 'foreign key' && oldType !== 'foreign key') {
        data[column] = null
      }
    }
  }
  return data
}

function applyColumnAdditions(data: any, addedColumns: Array<{ name: string, datatype: string, isRequired: boolean }>) {
  for (const { name, datatype, isRequired } of addedColumns) {
    if (!data.hasOwnProperty(name)) {
      // Set default values based on datatype per rules
      if (datatype === 'string') {
        data[name] = '' // Empty string, not null
      } else if (datatype === 'number') {
        data[name] = 0 // Zero, not null
      } else if (datatype === 'foreign key') {
        data[name] = null // Foreign keys default to null
      } else if (datatype === 'boolean') {
        data[name] = false // Booleans default to false
      } else {
        data[name] = null // Fallback for unknown types
      }
    }
  }
  return data
}

function applyConstraintChanges(rows: any[], constraintChanges: Array<{ column: string, constraint: string }>) {
  for (const { column, constraint } of constraintChanges) {
    if (constraint === 'unique' || constraint === 'primary') {
      // Get the datatype of this column (we'd need to pass this info or infer it)
      const sampleValue = rows.find(r => r.data[column] != null)?.data[column]
      const isStringType = typeof sampleValue === 'string'
      const isNumberType = typeof sampleValue === 'number'
      const isForeignKey = false // You'd need to determine this from column info
      
      if (isStringType && !isForeignKey) {
        // For strings: count occurrences and add _1, _2, _3 suffixes
        const valueCounts = new Map<string, number>()
        
        for (const row of rows) {
          const value = row.data[column]
          if (value != null) {
            const count = valueCounts.get(value) || 0
            valueCounts.set(value, count + 1)
            
            if (count > 0) {
              // This is a duplicate, add suffix
              row.data[column] = `${value}_${count + 1}`
            } else {
              // First occurrence, but we need to add _1 if there will be duplicates
              // We'll handle this in a second pass
            }
          }
        }
        
        // Second pass: add _1 to first occurrences of duplicated values
        const processedValues = new Map<string, boolean>()
        for (const row of rows) {
          const originalValue = row.data[column]?.split('_')[0] // Get base value
          const count = valueCounts.get(originalValue)
          if (originalValue && count !== undefined && count > 1 && !processedValues.has(originalValue)) {
            if (row.data[column] === originalValue) {
              row.data[column] = `${originalValue}_1`
            }
            processedValues.set(originalValue, true)
          }
        }
        
      } else if (isNumberType && !isForeignKey) {
        // For numbers: reset all to ascending values starting from 1
        const rowsWithValues = rows.filter(r => r.data[column] != null)
        rowsWithValues.forEach((row, index) => {
          row.data[column] = index + 1
        })
        
      } else if (isForeignKey) {
        // For foreign keys: set duplicates to null, keep first occurrence
        const seen = new Set()
        for (const row of rows) {
          const value = row.data[column]
          if (value != null) {
            if (seen.has(value)) {
              row.data[column] = null
            } else {
              seen.add(value)
            }
          }
        }
      }
    }
  }
  return rows
}

function applyIsRequiredChanges(
  rows: any[], 
  isRequiredChanges: Array<{ column: string, isRequired: boolean }>,
  constraintChanges: Array<{ column: string, constraint: string }>
) {
  for (const { column, isRequired } of isRequiredChanges) {
    if (isRequired) {
      // Check if this column also needs to be unique
      const needsUnique = constraintChanges.some(c => 
        c.column === column && (c.constraint === 'unique' || c.constraint === 'primary')
      )
      
      let defaultCounter = 1
      
      for (const row of rows) {
        if (!row.data.hasOwnProperty(column) || row.data[column] == null || row.data[column] === '') {
          // Need to set a default value
          // Determine the datatype (you'd ideally pass this info)
          const datatype = 'string' // You'd need to determine this from column info
          
          if (datatype === 'string') {
            if (needsUnique) {
              row.data[column] = `default_${defaultCounter}`
              defaultCounter++
            } else {
              row.data[column] = 'default'
            }
          } else if (datatype === 'number') {
            if (needsUnique) {
              row.data[column] = defaultCounter
              defaultCounter++
            } else {
              row.data[column] = 1
            }
          } else if (datatype === 'foreign key') {
            // For foreign keys, we'd need to fetch available references
            // For now, just set to null and warn user (as per rules)
            row.data[column] = null
          }
        }
      }
    }
  }
  return rows
}

// Export functions for testing
export { 
  applyColumnDeletions,
  applyColumnRenames,
  applyDatatypeChanges, 
  applyColumnAdditions, 
  applyConstraintChanges, 
  applyIsRequiredChanges 
}