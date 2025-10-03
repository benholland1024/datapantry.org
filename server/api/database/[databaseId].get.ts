/**
 * GET /api/database/[databaseId]?sessionId=...
 * Returns the tables and columns for the specified database.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { sessions, users, userTablePositions } from '../../postgresDB/schema'
import Database from 'better-sqlite3' 
import path from 'path'

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

    // Get tables from Postgres for this database
    const postgresTables = await db
      .select({
        name: userTablePositions.name,
        x: userTablePositions.x,
        y: userTablePositions.y
      })
      .from(userTablePositions)
      .where(and(
        eq(userTablePositions.databaseId, databaseId),
        eq(userTablePositions.databaseId, databaseId)
      ))

    // Get tables for database (the user's SQLite DB)
    const tablesWithColumns: any[] = []

    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )
    try {
      const sqliteDb = new Database(sqlitePath)
      // Query all user tables (exclude SQLite system tables)
      const tables = sqliteDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[]
      for (const table of tables) {
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

        // Format columns with constraints
        const formattedColumns = columns.map(col => {
          // Foreign key info for this column
          const fk = foreignKeys.find(f => f.from === col.name)
          return {
            name: col.name,
            datatype: col.type,
            isRequired: !!col.notnull,
            default: col.dflt_value,
            constraint: getColumnConstraint(col),
            foreignKey: fk
              ? {
                  table: fk.table,
                  column: fk.to,
                  onUpdate: fk.on_update,
                  onDelete: fk.on_delete
                }
              : undefined
          }
        })

        // Get position info from Postgres
        const postgresTable = postgresTables.find(t => t.name === table.name)
        const position = { x: 0, y: 0 }
        if (postgresTable) {
          position.x = postgresTable.x
          position.y = postgresTable.y
        }
        tablesWithColumns.push({
          name: table.name,
          columns: formattedColumns,
          x: position.x,
          y: position.y
        })
      }
      sqliteDb.close()
    } catch (err) {
      // Optionally handle missing/corrupt DB files
      console.error(`Error reading tables from ${sqlitePath}:`, err)
    }

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