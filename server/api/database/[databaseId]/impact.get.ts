/**
 * GET /api/database/[databaseId]/impact
 * 
 * Get the impact of deleting a database, 
 * including the number of tables and rows that would be deleted.
 */

import { eq, count } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { userDatabases, sessions, users } from '../../../postgresDB/schema'
import path from 'path'
import Database from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const query = getQuery(event)
    const sessionId = getCookie(event, 'sessionId')

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

    // Get the database name
    const [database] = await db
      .select({ name: userDatabases.name })
      .from(userDatabases)
      .where(eq(userDatabases.id, Number(databaseId)))
      .limit(1)

    if (!database) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Database not found'
      })
    }

    // Get number of tables in the database
    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )
    const sqliteDb = new Database(sqlitePath)
    const tables = sqliteDb.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`
    ).all() as { name: string }[]

    const tableCount = tables.length

    // Get number of rows across all tables in the database
    let totalRowCount = 0
    for (const table of tables) {
      const rowCount = sqliteDb.prepare(`SELECT COUNT(*) as count FROM '${table.name}'`).get() as { count: number }
      totalRowCount += rowCount.count || 0
    }

    return { 
      success: true, 
      databaseId: databaseId,
      databaseName: database.name,
      tableCount: tableCount,
      totalRowCount: totalRowCount
    }
    
  } catch (error: any) {
    console.error('Impact analysis error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load database impact data'
    })
  }
})