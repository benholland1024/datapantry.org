import { eq, and } from 'drizzle-orm'
import { db } from '../../../../postgresDB'
import { userTables, rows, sessions, users } from '../../../../postgresDB/schema'

export default defineEventHandler(async (event) => {
  try {
    const tableId = getRouterParam(event, 'tableId') as string
    const rowId = getRouterParam(event, 'rowId') as string
    const { row, sessionId } = await readBody(event)

    if (!sessionId || !tableId || !rowId || !row) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, table ID, row ID, and row required'
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
    const [existingRow] = await db
      .select()
      .from(rows)
      .where(and(
        eq(rows.id, rowId),
        eq(rows.tableId, tableId)
      ))
      .limit(1)


    if (!existingRow) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Row not found'
      })
    }

    // Update row
    const updateResult = await db
      .update(rows)
      .set({ 
        data: row.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(rows.id, rowId),
        eq(rows.tableId, tableId)
      ))
      .returning()

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