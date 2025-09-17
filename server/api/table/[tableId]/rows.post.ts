import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../../../database'
import { userTables, rows, sessions, users } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const tableId = getRouterParam(event, 'tableId') as string
    const { data, sessionId } = await readBody(event)

    if (!sessionId || !tableId || !data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID, table ID, and data required'
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

    // Verify table exists and belongs to user
    const [table] = await db
      .select()
      .from(userTables)
      .where(eq(userTables.id, tableId))
      .limit(1)

    if (!table) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Table not found'
      })
    }

    // Remove any 'id' field from the data before storing
    const { id: dataId, ...cleanData } = data || {}

    // Create new row
    const rowId = uuidv4()
    const [newRow] = await db
      .insert(rows)
      .values({
        id: rowId,
        tableId: tableId,
        data: cleanData  // Store clean data without id
      })
      .returning()

    return {
      success: true,
      row: {
        id: newRow.id,
        ...newRow.data
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