/**
 * POST /api/database/:databaseId
 * Saves non-destructive schema changes: adding tables and updating positions.
 * 
 * For destructive changes, use:
 *  -  GET /api/table/:tableId/impact to get # rows affected, col differences, etc
 *  -  PUT /api/table/:tableId for column changes
 *  -  This file _can_ delete tables that were removed in the frontend. 
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../postgresDB'
import { 
  userTablePositions, 
  userDatabases,
  sessions, 
  users
} from '../../postgresDB/schema'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

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

    // Get SQLite database path
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

    // Get existing table names from SQLite
    const existingTablesResult = sqliteDb
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all()
    const existingTableNames = existingTablesResult.map((t: any) => t.name)

    // Find tables to delete (exist in SQLite but not in frontend)
    const frontendTableNames = tables.map((table: any) => table.name)
    const tablesToDelete = existingTableNames.filter(name => !frontendTableNames.includes(name))

    // Delete tables that are no longer in the frontend
    for (const tableName of tablesToDelete) {
      
      // Drop table from SQLite
      const dropTableSQL = `DROP TABLE \`${tableName}\``
      sqliteDb.prepare(dropTableSQL).run()

      // Remove position data from Postgres
      await db
        .delete(userTablePositions)
        .where(and(
          eq(userTablePositions.databaseId, databaseId),
          eq(userTablePositions.name, tableName)
        ))
    }

    // Process each table
    for (const table of tables) {

      // If table doesn't exist in SQLite, create it
      if (!existingTableNames.includes(table.name)) {
        // Create table with default column (id as primary key)
        const createTableSQL = `CREATE TABLE \`${table.name}\` (id REAL PRIMARY KEY)`
        sqliteDb.prepare(createTableSQL).run()
      }

      // Update or insert position in Postgres
      const existingPosition = await db
        .select()
        .from(userTablePositions)
        .where(and(
          eq(userTablePositions.databaseId, databaseId),
          eq(userTablePositions.name, table.name)
        ))
        .limit(1)

      if (existingPosition.length > 0) {
        // Update existing position
        await db
          .update(userTablePositions)
          .set({
            x: table.x,
            y: table.y
          })
          .where(and(
            eq(userTablePositions.databaseId, databaseId),
            eq(userTablePositions.name, table.name)
          ))
      } else {
        // Insert new position
        await db
          .insert(userTablePositions)
          .values({
            databaseId,
            name: table.name,
            x: table.x,
            y: table.y
          })
      }
    }

    sqliteDb.close()

    // Return updated schema
    const savedPositions = await db
      .select()
      .from(userTablePositions)
      .where(eq(userTablePositions.databaseId, databaseId))

    const tablesWithPositions = savedPositions.map(pos => ({
      name: pos.name,
      x: pos.x,
      y: pos.y
    }))

    return { success: true, tables: tablesWithPositions }
    
  } catch (error: any) {
    console.error('Save schema error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save schema'
    })
  }
})