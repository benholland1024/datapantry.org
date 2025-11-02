/**
 * GET /api/database/:databaseId/table?tableName=Grocery Cart&sessionId=...
 * Responds with a table, its columns, and its rows.
 * 
 */

import { eq } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { userDatabases, sessions, users } from '../../../postgresDB/schema'
import path from 'path'
import Database from 'better-sqlite3' 
import { v4 as uuidv4, v6 as uuidv6 } from 'uuid';

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const query = getQuery(event)
    const { sessionId, tableName } = query

    if (!sessionId || !databaseId || !tableName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, database ID, and table name required'
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

    // Get the table, ensuring it exists
    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )

    const sqliteDb = new Database(sqlitePath)
    const table = sqliteDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName) as { name: string } | undefined

    if (!table) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found'
      })
    }

    // Get table rows
    const tableRows = sqliteDb.prepare(`SELECT * FROM '${table.name}'`).all() as Array<{ id: string, data: any }>

    // Get table columns
    // Get columns for this table
    const columns = sqliteDb.prepare(`PRAGMA table_info(\'${table.name}\')`).all() as {
      cid: number,
      name: string,
      type: string,
      notnull: number,
      dflt_value: any,
      pk: number
    }[]

    // Get foreign keys for this table
    const foreignKeys = sqliteDb.prepare(`PRAGMA foreign_key_list(\'${table.name}\')`).all() as {
      id: number,
      seq: number,
      table: string,
      from: string,
      to: string,
      on_update: string,
      on_delete: string,
      match: string
    }[]

    // Get unique indexes for this table
    const indexes = sqliteDb.prepare(`PRAGMA index_list(\'${table.name}\')`).all() as {
      seq: number,
      name: string,
      unique: number
    }[]

    // Find unique columns
    const uniqueColumns = new Set<string>()
    for (const idx of indexes.filter(i => i.unique)) {
      const idxInfo = sqliteDb.prepare(`PRAGMA index_info(\'${idx.name}\')`).all() as { name: string }[]
      for (const col of idxInfo) {
        uniqueColumns.add(col.name)
      }
    }

    //  Get constraint (should be 'primary', 'unique', or 'none')
    const getColumnConstraint = (col: any) => {
      if (col.pk) return 'primary'
      if (uniqueColumns.has(col.name)) return 'unique'
      return 'none'
    }

    // Get metadata from __datapantry_metadata table
    const metadata: Record<string, Record<string, string>> = {}
    let metadataRows: { table_name: string, column_name: string, semantic_type: string }[] = []
    try {
      metadataRows = sqliteDb.prepare(`
        SELECT table_name, column_name, semantic_type FROM __datapantry_metadata
      `).all() as { table_name: string, column_name: string, semantic_type: string }[]
      for (const row of metadataRows) {
        if (!metadata[row.table_name]) {
          metadata[row.table_name] = {}
        }
        metadata[row.table_name][row.column_name] = row.semantic_type
      }
    } catch (err) {
      // Table may not exist yet; ignore error
    }
    

    // Format columns with constraints
    const formattedColumns = columns.map(col => {
      // Foreign key info for this column
      const fk = foreignKeys.find(f => f.from === col.name)
      if (fk) { col.type = 'Foreign Key' } // Override type for FK columns
      const semanticType = metadata[table.name] ? metadata[table.name][col.name] : undefined
      return {
        name: col.name,
        datatype: semanticType || col.type,
        isRequired: !!col.notnull,
        default: col.dflt_value,
        constraint: getColumnConstraint(col),
        foreignKey: fk
          ? {
              tableName: fk.table,
              columnName: fk.to,
              onUpdate: fk.on_update,
              onDelete: fk.on_delete
            }
          : undefined
      }
    })

    // Format the response
    const tableWithData = {
      name: table.name,
      columns: formattedColumns.map(col => ({
        name: col.name,
        datatype: col.datatype,
        constraint: col.constraint || 'none',
        isRequired: col.isRequired || false,
        foreignKey: col.foreignKey
      }))
    }

    return { 
      success: true, 
      table: tableWithData,
      rows: tableRows.map(r => ({ id: uuidv4(), data: r } ))
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