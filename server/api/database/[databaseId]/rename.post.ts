// /**
//  * POST /api/database/[databaseId]/rename
//  * Rename a database
//  */

// import { eq } from 'drizzle-orm'
// import { db } from '../../../postgresDB'
// import { databases, sessions, users } from '../../../postgresDB/schema'

// export default defineEventHandler(async (event) => {
//   try {
//     const { newName, sessionId } = await readBody(event)
//     const databaseId = event.context.params?.databaseId


//     if (!newName || !sessionId || !databaseId) {
//       throw createError({
//         statusCode: 400,
//         statusMessage: 'Database name, session ID, and database ID are required'
//       })
//     }

//     // Validate session and get user
//     const [sessionWithUser] = await db
//       .select({
//         userId: sessions.userId,
//         user: {
//           id: users.id,
//           username: users.username,
//         }
//       })
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

//     //  Get the current database
//     const [currentDatabase] = await db
//       .select()
//       .from(databases)
//       .where(eq(databases.id, Number(databaseId)))
//       .limit(1)

//     if (!currentDatabase) {
//       throw createError({
//         statusCode: 404,
//         statusMessage: 'Database not found'
//       })
//     }

//     //  Check if the database belongs to the user
//     if (currentDatabase.userId !== sessionWithUser.userId) {
//       throw createError({
//         statusCode: 403,
//         statusMessage: 'You do not have permission to rename this database'
//       })
//     }

//     //  Update the database name
//     const [updatedDatabase] = await db.update(databases)
//       .set({ name: newName })
//       .where(eq(databases.id, Number(databaseId)))
//       .returning({
//         id: databases.id,
//         name: databases.name,
//         createdAt: databases.createdAt,
//       })

//     return {
//       success: true,
//       database: {
//         ...updatedDatabase,
//       }
//     }
    
//   } catch (error: any) {
//     console.error('Create database error:', error)
    
//     if (error.statusCode) {
//       throw error
//     }
    
//     throw createError({
//       statusCode: 500,
//       statusMessage: 'Failed to create database'
//     })
//   }
// })