/**
 * PUT /api/database/:databaseId/table?tableName=...
 * Updates a table and table columns. 
 * Can be passed a "preserveData" flag to keep or delete existing rows. 
 * Body: { newTableName?, columns: [...], columnChanges: [...], preserveData: boolean }
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { 
  sessions, 
  users, 
  userDatabases,
  userTablePositions
} from '../../../postgresDB/schema'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { get } from 'http'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = parseInt(getRouterParam(event, 'databaseId') as string)
    const { newTableName, columns, columnChanges, preserveData } = await readBody(event)

    console.log('Update table with columns:', columns)
    console.log('Column changes:', JSON.stringify(columnChanges, null, 2))
    
    const query = getQuery(event)
    const { tableName } = query
    const sessionId = getCookie(event, 'sessionId')

    if (!sessionId || !tableName || !databaseId || !columns) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, table name, database ID, and columns required'
      })
    }

    // Validate session
    const [sessionWithUser] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, String(sessionId)))
      .limit(1)
      
    if (!sessionWithUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid session'
      })
    }

    // Verify user owns this database
    const [database] = await db
      .select()
      .from(userDatabases)
      .where(and(
        eq(userDatabases.id, databaseId),
        eq(userDatabases.userId, sessionWithUser.userId)
      ))
      .limit(1)

    if (!database) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      })
    }

    // Get SQLite database
    const userId = sessionWithUser.userId
    const userDir = path.resolve(process.cwd(), 'server', 'userDBs', String(userId))
    const sqlitePath = path.join(userDir, `${databaseId}.sqlite`)
    
    if (!fs.existsSync(sqlitePath)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'SQLite database file not found'
      })
    }

    const sqliteDb = new Database(sqlitePath)

    // Verify table exists
    const tableExists = sqliteDb
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
      .get(tableName as string)
    
    if (!tableExists) {
      sqliteDb.close()
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found'
      })
    }

    // Read existing data if preserving
    let existingRows: any[] = []
    if (preserveData) {
      existingRows = sqliteDb
        .prepare(`SELECT * FROM "${tableName}"`)
        .all()
    }

    // Check if metadata table exists - can remove this after initial rollout
    const metadataTableExists = sqliteDb
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='__datapantry_metadata'`)
      .get()
    
    if (!metadataTableExists) {
      // Create metadata table
      const createMetadataSQL = `CREATE TABLE __datapantry_metadata (
        table_name TEXT,
        column_name TEXT,
        semantic_type TEXT,
        PRIMARY KEY (table_name, column_name)
      )`
      sqliteDb.prepare(createMetadataSQL).run()
    }

    // SQLite has limited ALTER TABLE support, so we'll rebuild the table
    // 1. Create new table with updated schema
    const tempTableName = `${tableName}_temp_${Date.now()}`
    const { sql: createTableSQL, semanticTypes } = buildCreateTableSQL(tempTableName, columns, sqliteDb)
    console.log('Create table SQL:', createTableSQL)
    sqliteDb.prepare(createTableSQL).run()
    

    // 2. If preserving data, transform and insert it
    if (preserveData && existingRows.length > 0) {
      const transformedRows = transformRows(existingRows, columnChanges, columns)
      
      // Validate foreign key values before inserting
      const validatedRows = validateForeignKeyValues(transformedRows, columns, sqliteDb)

      // Build INSERT statement
      const columnNames = columns.map((c: any) => `"${c.name}"`).join(', ')
      const placeholders = columns.map(() => '?').join(', ')
      console.log('About to run this: ', `INSERT INTO "${tempTableName}" (${columnNames}) VALUES (${placeholders})`)
      const insertStmt = sqliteDb.prepare(
        `INSERT INTO "${tempTableName}" (${columnNames}) VALUES (${placeholders})`
      )

      // Insert transformed rows
      for (const row of validatedRows) {
        const values = columns.map((col: any) => row[col.name] ?? null)
        insertStmt.run(values)
      }
    }

    // 3. Drop old table and rename temp table
    sqliteDb.prepare(`DROP TABLE "${tableName}"`).run()
    const finalTableName = (newTableName && newTableName.trim() !== '') ? newTableName.trim() : tableName
    sqliteDb.prepare(`ALTER TABLE "${tempTableName}" RENAME TO "${finalTableName}"`).run()

    // 4. Update metadata table with semantic types
    //  Save semantic type in metadata table if applicable
    for (const col of columns) {
      const semanticType = semanticTypes[col.name] || 'none'
      if (!semanticType || semanticType === 'none') {
        // Delete existing metadata entry if any
        const deleteMetaSQL = `DELETE FROM __datapantry_metadata WHERE table_name = ? AND column_name = ?`
        sqliteDb.prepare(deleteMetaSQL).run(tableName, col.name)
      } else { // Insert or update metadata
        const insertMetaSQL = `INSERT OR REPLACE INTO __datapantry_metadata (table_name, column_name, semantic_type) VALUES (?, ?, ?)`
        sqliteDb.prepare(insertMetaSQL).run(tableName, col.name, semanticType)
      }
    }
    

    // 5. Update table name in Postgres positions table if renamed
    if (newTableName && newTableName.trim() !== '' && newTableName !== tableName) {
      await db
        .update(userTablePositions)
        .set({ name: newTableName.trim() })
        .where(and(
          eq(userTablePositions.databaseId, databaseId),
          eq(userTablePositions.name, tableName as string)
        ))
    }

    sqliteDb.close()

    return { success: true }
    
  } catch (error: any) {
    console.error('Update table error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update table'
    })
  }
})

function buildCreateTableSQL(tableName: string, columns: any[], sqliteDb: any): { sql: string, semanticTypes: Record<string, string> } {
  const semanticTypes: Record<string, string> = {}
  const columnDefs = columns.map(col => {
    let def = `"${col.name}" `
    let semanticType = ''

    // Map datatype to SQLite type
    switch(col.datatype.toLowerCase()) {
      case 'integer':
        def += 'INTEGER'
        break
      case 'real':
        def += 'REAL'
        break
      case 'text':
        def += 'TEXT'
        break
      case 'date':
        def += 'TEXT'
        semanticType = 'DATE'
        break
      case 'time':
        def += 'TEXT'
        semanticType = 'TIME'
        break
      case 'datetime':
        def += 'TEXT'
        semanticType = 'DATETIME'
        break
      case 'boolean':
        def += 'INTEGER' // SQLite uses 0/1 for booleans
        semanticType = 'BOOLEAN'
        break
      case 'foreign key':
        // FK type matches referenced column type
        let type = getForeignKeyColumnType(
          sqliteDb,
          col.foreignKey?.tableName,
          col.foreignKey?.columnName
        )
        def += type ? type : 'REAL' // Default, should ideally check referenced column
        break
      default:
        def += 'TEXT'
    }
    
    // Add constraints
    if (col.constraint === 'primary') {
      def += ' PRIMARY KEY'
    } else if (col.constraint === 'unique') {
      def += ' UNIQUE'
    }
    
    if (col.isRequired) {
      def += ' NOT NULL'
    }

    if (semanticType) {
      semanticTypes[col.name] = semanticType
    }
    
    return def
  })
  
  // Add foreign key constraints
  const foreignKeys = columns
    .filter(col => col.datatype.toLowerCase() === 'foreign key' && col.foreignKey)
    .map(col => {
      return `FOREIGN KEY ("${col.name}") REFERENCES "${col.foreignKey.tableName}"("${col.foreignKey.columnName}")`
    })
  
  const allDefs = [...columnDefs, ...foreignKeys].join(', ')
  return {
    sql: `CREATE TABLE "${tableName}" (${allDefs})`,
    semanticTypes
  }
}

//  Gets the datatype of the foreign key column from the referenced table
function getForeignKeyColumnType(
  sqliteDb: any, 
  referencedTable: string, 
  referencedColumn: string
): string | null {
  const pragma = sqliteDb
    .prepare(`PRAGMA table_info("${referencedTable}")`)
    .all()
  
  const columnInfo = pragma.find((col: any) => col.name === referencedColumn)
  return columnInfo ? columnInfo.type : null
}

function transformRows(existingRows: any[], columnChanges: any[], newColumns: any[]): any[] {
  // Parse changes by type
  const deletedColumns = columnChanges
    .filter(c => c.type === 'delete')
    .map(c => c.name)
  
  const renamedColumns = columnChanges
    .filter(c => c.type === 'rename')
    .map(c => ({ oldName: c.oldName, newName: c.newName }))
  
  const datatypeChanges = columnChanges
    .filter(c => c.type === 'datatype')
    .map(c => ({ column: c.name, oldType: c.oldType, newType: c.newType }))
  
  const addedColumns = columnChanges
    .filter(c => c.type === 'add')
    .map(c => ({ name: c.name, datatype: c.datatype, isRequired: c.isRequired }))
  
  const constraintChanges = columnChanges
    .filter(c => c.type === 'constraint')
    .map(c => ({ column: c.name, constraint: c.constraint }))
  
  const isRequiredChanges = columnChanges
    .filter(c => c.type === 'isRequired')
    .map(c => ({ column: c.name, isRequired: c.isRequired }))

  // Transform each row
  let transformedRows = existingRows.map(row => {
    let data = { ...row }
    
    // Apply deletions
    for (const col of deletedColumns) {
      delete data[col]
    }
    
    // Apply renames
    for (const { oldName, newName } of renamedColumns) {
      if (data.hasOwnProperty(oldName)) {
        data[newName] = data[oldName]
        delete data[oldName]
      }
    }
    
    // Apply datatype changes
    for (const { column, oldType, newType } of datatypeChanges) {
      if (data.hasOwnProperty(column)) {
        data[column] = convertDatatype(data[column], oldType, newType)
      }
    }
    
    // Apply additions
    for (const { name, datatype, isRequired } of addedColumns) {
      if (!data.hasOwnProperty(name)) {
        data[name] = getDefaultValue(datatype)
      }
    }
    
    return data
  })

  // Apply constraint changes (needs all rows at once)
  transformedRows = applyConstraintChanges(transformedRows, constraintChanges, newColumns)
  
  // Apply isRequired changes
  transformedRows = applyIsRequiredChanges(transformedRows, isRequiredChanges, constraintChanges, newColumns)

  return transformedRows
}

function convertDatatype(value: any, oldType: string, newType: string): any {
  const oldTypeLower = oldType.toLowerCase()
  const newTypeLower = newType.toLowerCase()
  
  // Number to String
  if (oldTypeLower === 'number' && newTypeLower === 'string') {
    return String(value)
  }
  // String to Number
  if (oldTypeLower === 'string' && newTypeLower === 'number') {
    const num = Number(String(value).trim())
    return isNaN(num) ? 0 : num
  }
  // String to Boolean
  if (oldTypeLower === 'string' && newTypeLower === 'boolean') {
    return String(value).toLowerCase() === 'true' ? 1 : 0
  }
  // Boolean to String
  if (oldTypeLower === 'boolean' && newTypeLower === 'string') {
    return value ? 'true' : 'false'
  }
  // Foreign Key to String
  if (oldTypeLower === 'foreign key' && newTypeLower === 'string') {
    return ''
  }
  // Foreign Key to Number
  if (oldTypeLower === 'foreign key' && newTypeLower === 'number') {
    return 0
  }
  // Foreign Key to Boolean
  if (oldTypeLower === 'foreign key' && newTypeLower === 'boolean') {
    return 0
  }
  // To Foreign Key
  if (newTypeLower === 'foreign key' && oldTypeLower !== 'foreign key') {
    return null
  }
  
  return value
}

function getDefaultValue(datatype: string): any {
  switch(datatype.toLowerCase()) {
    case 'string': return ''
    case 'number': return 0
    case 'boolean': return 0 // SQLite uses 0 for false
    case 'foreign key': return null
    default: return null
  }
}

function applyConstraintChanges(rows: any[], constraintChanges: any[], columns: any[]): any[] {
  for (const { column, constraint } of constraintChanges) {
    if (constraint === 'unique' || constraint === 'primary') {
      // Find column datatype
      const col = columns.find((c: any) => c.name === column)
      if (!col) continue
      
      const isString = col.datatype.toLowerCase() === 'string'
      const isNumber = col.datatype.toLowerCase() === 'number'
      const isForeignKey = col.datatype.toLowerCase() === 'foreign key'
      
      if (isString && !isForeignKey) {
        // Add _1, _2, _3 suffixes for duplicates
        const valueCounts = new Map<string, number>()
        
        for (const row of rows) {
          const value = String(row[column] || '')
          const count = valueCounts.get(value) || 0
          
          if (count > 0) {
            row[column] = `${value}_${count + 1}`
          } else if (rows.filter(r => r[column] === value).length > 1) {
            // Will have duplicates, add _1 to first occurrence
            row[column] = `${value}_1`
          }
          
          valueCounts.set(value, count + 1)
        }
      } else if (isNumber && !isForeignKey) {
        // Reset to ascending 1, 2, 3...
        rows.forEach((row, index) => {
          row[column] = index + 1
        })
      } else if (isForeignKey) {
        // Set duplicates to null, keep first
        const seen = new Set()
        for (const row of rows) {
          const value = row[column]
          if (value != null) {
            if (seen.has(value)) {
              row[column] = null
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
  isRequiredChanges: any[],
  constraintChanges: any[],
  columns: any[]
): any[] {
  for (const { column, isRequired } of isRequiredChanges) {
    if (isRequired) {
      const col = columns.find((c: any) => c.name === column)
      if (!col) continue
      
      const needsUnique = constraintChanges.some(c => 
        c.column === column && (c.constraint === 'unique' || c.constraint === 'primary')
      )
      
      let defaultCounter = 1
      
      for (const row of rows) {
        if (row[column] == null || row[column] === '') {
          const datatype = col.datatype.toLowerCase()
          
          if (datatype === 'string') {
            row[column] = needsUnique ? `default_${defaultCounter++}` : 'default'
          } else if (datatype === 'number') {
            row[column] = needsUnique ? defaultCounter++ : 1
          } else if (datatype === 'foreign key') {
            row[column] = null
          }
        }
      }
    }
  }
  return rows
}

// Export functions for testing
export { 
  buildCreateTableSQL,
  transformRows,
  convertDatatype,
  getDefaultValue, 
  applyConstraintChanges, 
  applyIsRequiredChanges 
}

function validateForeignKeyValues(
  rows: any[], 
  columns: any[], 
  sqliteDb: any
): any[] {
  const fkColumns = columns.filter(col => col.datatype.toLowerCase() === 'foreign key')
  
  for (const fkCol of fkColumns) {
    if (!fkCol.foreignKey) continue
    
    // Get valid values from referenced table
    try {
      const validValues = sqliteDb
        .prepare(`SELECT DISTINCT "${fkCol.foreignKey.columnName}" FROM "${fkCol.foreignKey.tableName}" WHERE "${fkCol.foreignKey.columnName}" IS NOT NULL`)
        .all()
        .map((row: any) => row[fkCol.foreignKey.columnName])
      
      // Clean up invalid FK values
      for (const row of rows) {
        const value = row[fkCol.name]
        if (value !== null && !validValues.includes(value)) {
          row[fkCol.name] = null
        }
      }
    } catch (error) {
      console.warn(`Could not validate FK values for ${fkCol.name}:`, error)
      // If we can't validate, set all FK values to null to be safe
      for (const row of rows) {
        row[fkCol.name] = null
      }
    }
  }
  
  return rows
}