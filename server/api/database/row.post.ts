import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../../postgresDB'
import { userDatabases, sessions, users } from '../../postgresDB/schema'
import path from 'path'
import Database from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const { row, sessionId, tableName } = await readBody(event)

    if (!sessionId || !databaseId || !row || !tableName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, database ID, table name, and row required'
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

    // Create new row
    const newRowId = uuidv4()
    const newRow = sqliteDb.prepare(`INSERT INTO '${table.name}' (id, data) VALUES (?, ?)`)
      .run(newRowId, JSON.stringify(row))

    if (newRow.changes === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create row'
      })
    }

    return {
      success: true,
      row: {
        id: newRowId,
        data: row
      }
    }
    
  } catch (error: any) {
    console.error('Create row error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create row'
    })
  }
})