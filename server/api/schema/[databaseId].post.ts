import { eq, inArray } from 'drizzle-orm'
import { db } from '../../database'
import { userTables, userColumns, sessions, users } from '../../database/schema'
import { v4 as uuidv4 } from 'uuid'

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

    //  Get existing table IDs
    const existingTables = await db
      .select({ id: userTables.id })
      .from(userTables)
      .where(eq(userTables.databaseId, databaseId))
    const existingTableIds = existingTables.map(t => t.id)

    //  Delete columns (to be replaced)
    if (existingTableIds.length > 0) {
      await db
        .delete(userColumns)
        .where(inArray(userColumns.tableId, existingTableIds))
    }

    // Clear existing tables for this database (before saving new ones)
    await db.delete(userTables).where(eq(userTables.databaseId, databaseId))


    // Save new tables
    for (const table of tables) {
      const [savedTable] = await db
        .insert(userTables)
        .values({
          id: table.id,
          databaseId,
          name: table.name,
          x: table.x,
          y: table.y,
        })
        .returning({ id: userTables.id })

      // Save columns
      if (table.columns && table.columns.length > 0) {

        const columnValues = table.columns.map((col: any, index: number) => ({
          id: uuidv4(),
          tableId: table.id,
          name: col.name,
          datatype: col.datatype,
          constraint: col.constraint || 'none',
          isRequired: col.isRequired || false,
          orderIndex: index,
          foreignKey: col.foreignKey || null 
        }))


        await db.insert(userColumns).values(columnValues)
      }
    }

    // After saving all tables, return the updated schema
    const savedTables = await db
    .select()
    .from(userTables)
    .where(eq(userTables.databaseId, databaseId))

    // Get columns for all saved tables
    const savedColumns = await db
    .select()
    .from(userColumns)
    .where(inArray(userColumns.tableId, savedTables.map(t => t.id)))

    // Build the response similar to the GET endpoint
    const tablesWithColumns = savedTables.map(table => ({
      id: table.id,
      name: table.name,
      x: table.x,
      y: table.y,
      columns: savedColumns
        .filter(col => col.tableId === table.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map(col => ({
          name: col.name,
          datatype: col.datatype,
          constraint: col.constraint || 'none',
          isRequired: col.isRequired || false,
          foreignKey: col.foreignKey
        }))
    }))

    return { success: true, tables: tablesWithColumns }
    
  } catch (error: any) {
    console.error('Save schema error:', error)
    
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save schema'
    })
  }
})