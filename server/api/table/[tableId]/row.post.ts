// import { eq } from 'drizzle-orm'
// import { v4 as uuidv4 } from 'uuid'
// import { db } from '../../../postgresDB'
// import { userTables, rows, sessions, users } from '../../../postgresDB/schema'

// export default defineEventHandler(async (event) => {
//   try {
//     const tableId = getRouterParam(event, 'tableId') as string
//     const { row, sessionId } = await readBody(event)

//     if (!sessionId || !tableId || !row) {
//       throw createError({
//         statusCode: 400,
//         statusMessage: 'Session ID, table ID, and row required'
//       })
//     }

//     // Validate session
//     const [sessionWithUser] = await db
//       .select({ userId: sessions.userId })
//       .from(sessions)
//       .innerJoin(users, eq(sessions.userId, users.id))
//       .where(eq(sessions.id, sessionId))
//       .limit(1)

//     if (!sessionWithUser) {
//       throw createError({
//         statusCode: 401,
//         statusMessage: 'Invalid session'
//       })
//     }

//     // Verify table exists and belongs to user
//     const [table] = await db
//       .select()
//       .from(userTables)
//       .where(eq(userTables.id, tableId))
//       .limit(1)

//     if (!table) {
//       throw createError({
//         statusCode: 404,
//         statusMessage: 'Table not found'
//       })
//     }

//     // Create new row
//     const [newRow] = await db
//       .insert(rows)
//       .values({
//         id: row.id,
//         tableId: tableId,
//         data: row.data
//       })
//       .returning()

//     return {
//       success: true,
//       row: {
//         id: newRow.id,
//         data: newRow.data
//       }
//     }
    
//   } catch (error: any) {
//     console.error('Create row error:', error)
    
//     if (error.statusCode) throw error
    
//     throw createError({
//       statusCode: 500,
//       statusMessage: 'Failed to create row'
//     })
//   }
// })