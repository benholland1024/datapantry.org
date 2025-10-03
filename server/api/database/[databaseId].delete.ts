// /**
//  * DELETE /api/database/:databaseId?sessionId=...
//  * 
//  * Delete a database and all its associated tables and rows.
//  * Requires a valid session ID for authentication.
//  */

// import { eq, and } from 'drizzle-orm'
// import { db } from '../../postgresDB'
// import { 
//   databases, 
//   userTables, 
//   userColumns, 
//   rows, 
//   sessions, 
//   users 
// } from '../../postgresDB/schema'

// export default defineEventHandler(async (event) => {
//   try {
//     const databaseId = getRouterParam(event, 'databaseId') as string
//     const query = getQuery(event)
//     const { sessionId } = query

//     if (!sessionId || !databaseId) {
//       throw createError({
//         statusCode: 400,
//         statusMessage: 'Session ID and database ID required'
//       })
//     }

//     // Validate session
//     const [sessionWithUser] = await db
//       .select({ userId: sessions.userId })
//       .from(sessions)
//       .innerJoin(users, eq(sessions.userId, users.id))
//       .where(eq(sessions.id, sessionId as string))
//       .limit(1)

//     if (!sessionWithUser) {
//       throw createError({
//         statusCode: 401,
//         statusMessage: 'Invalid session'
//       })
//     }

//     // Verify the database exists and belongs to the user
//     const [database] = await db
//       .select({ id: databases.id })
//       .from(databases)
//       .where(
//         and(
//           eq(databases.id, Number(databaseId)),
//           eq(databases.userId, sessionWithUser.userId)
//         )
//       )
//       .limit(1)

//     if (!database) {
//       throw createError({
//         statusCode: 404,
//         statusMessage: 'Database not found'
//       })
//     }

//     // Delete all rows in all tables of the database
//     const tables = await db
//       .select({ id: userTables.id })
//       .from(userTables)
//       .where(eq(userTables.databaseId, Number(databaseId)))

//     for (const table of tables) {
//       await db
//         .delete(rows)
//         .where(eq(rows.tableId, table.id))
//     }

//     // Delete all columns in all tables of the database
//     for (const table of tables) {
//       await db
//         .delete(userColumns)
//         .where(eq(userColumns.tableId, table.id))
//     }

//     // Delete all tables in the database
//     await db
//       .delete(userTables)
//       .where(eq(userTables.databaseId, Number(databaseId)))

//     // Delete the database itself
//     await db
//       .delete(databases)
//       .where(eq(databases.id, Number(databaseId)))

//     return { success: true }

//   } catch (error: any) {
//     throw createError({
//       statusCode: error.statusCode || 500,
//       statusMessage: error.statusMessage || 'Failed to delete database'
//     })
//   }
// })