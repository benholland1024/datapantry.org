import { eq, and } from 'drizzle-orm'
import { db } from '../../../postgresDB'
import { sessions, users } from '../../../postgresDB/schema'
import path from 'path'
import Database from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  try {
    const databaseId = getRouterParam(event, 'databaseId') as string
    const { row, oldRowPK, pkColumn, sessionId, tableName } = await readBody(event)

    if (!sessionId || !databaseId || !tableName || !row || !oldRowPK || !pkColumn) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, database ID, table name,' +
         ' old row primary key, primary key column, and row required'
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

    // Check if row exists before update
    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(sessionWithUser.userId),
      `${databaseId}.sqlite`
    )
    const sqliteDb = new Database(sqlitePath)
    const existingRow = sqliteDb.prepare(`SELECT * FROM '${tableName}' WHERE ${pkColumn} = ?`)
      .get(oldRowPK) as { id: string, [key: string]: any } | undefined


    if (!existingRow) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Row not found'
      })
    }

    // Update row
    const updateResult = sqliteDb.prepare(
      `UPDATE '${tableName}' SET ${Object.keys(row.data).map(col => `'${col}' = ?`).join(', ')} 
       WHERE ${pkColumn} = ? RETURNING *`
    ).all(...Object.values(row.data), oldRowPK) as { id: string, [key: string]: any }[]

    if (updateResult.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update row'
      })
    }

    return { success: true, updatedRow: updateResult[0] }
    
  } catch (error: any) {
    console.error('Update row error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update row'
    })
  }
})