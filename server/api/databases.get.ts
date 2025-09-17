import { eq, inArray } from 'drizzle-orm'
import { db } from '../database'
import { databases, sessions, users, userTables } from '../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { sessionId } = query

    if (!sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Session ID required'
      })
    }

    // Validate session and get user
    const [sessionWithUser] = await db
      .select({
        userId: sessions.userId,
      })
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

    // Get user's databases with table counts
    const userDatabases = await db
      .select({
        id: databases.id,
        name: databases.name,
        createdAt: databases.createdAt,
      })
      .from(databases)
      .where(eq(databases.userId, sessionWithUser.userId))

    // Get all tables for these databases
    const databaseIds = userDatabases.map(db => db.id)
    const allTables = databaseIds.length > 0 
      ? await db
          .select({
            id: userTables.id,
            name: userTables.name,
            databaseId: userTables.databaseId,
          })
          .from(userTables)
          .where(inArray(userTables.databaseId, databaseIds))
      : []

    // Group tables by database
    const databasesWithTables = userDatabases.map(database => ({
      ...database,
      tables: allTables.filter(table => table.databaseId === database.id)
    }))

    return { 
      success: true, 
      databases: databasesWithTables
    }
    
  } catch (error: any) {
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch databases'
    })
  }
})