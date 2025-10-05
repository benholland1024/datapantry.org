// /**
//  * Delete a row from a table.
//  * 
//  * DELETE /api/table/:tableId/row/:rowId
//  * 
//  * Parameters:
//  * - sessionId: string (required)
//  * - tableId: string (from URL, required)
//  * - rowId: string (from URL, required)
//  */

// import { eq, and } from 'drizzle-orm'
// import { db } from '../../../../postgresDB'
// import { rows, sessions, users } from '../../../../postgresDB/schema'

// export default defineEventHandler(async (event) => {
//   try {
//     const tableId = getRouterParam(event, 'tableId') as string
//     const rowId = getRouterParam(event, 'rowId') as string
//     const { sessionId } = await readBody(event)

//     if (!sessionId || !tableId || !rowId) {
//       throw createError({
//         statusCode: 400,
//         statusMessage: 'Session ID, table ID, and row ID required'
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

//     // Delete row
//     await db
//       .delete(rows)
//       .where(and(
//         eq(rows.id, rowId),
//         eq(rows.tableId, tableId)
//       ))

//     return { success: true }
    
//   } catch (error: any) {
//     console.error('Delete row error:', error)
    
//     if (error.statusCode) throw error
    
//     throw createError({
//       statusCode: 500,
//       statusMessage: 'Failed to delete row'
//     })
//   }
// })