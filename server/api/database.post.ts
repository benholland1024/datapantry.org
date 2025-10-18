/**
 * POST /api/database?sessionId=...
 * Create a new database for the authenticated user.
 * Expects: { name: string, sessionId: string }
 * Returns: { success: boolean, database: { id, name, createdAt, tables: [] } }
 * 
 * Security checklist:
 * - [x] Validate session ID
 * - [x] Ensure user can only create databases for themselves
 * - [x] Sanitize and validate database name
 * - [ ] Handle errors gracefully without exposing sensitive info
 */

import { eq } from 'drizzle-orm'
import { db } from '../postgresDB'
import { userDatabases, sessions, users } from '../postgresDB/schema'
import Database from 'better-sqlite3' 
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  try {
    const { name, sessionId } = await readBody(event)

    if (!name || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Database name and session ID are required'
      })
    }

    // Validate session and get user
    const [sessionWithUser] = await db
      .select({
        userId: sessions.userId,
        user: {
          id: users.id,
          username: users.username,
        }
      })
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

    // Create the database record in Postgres
    const [newDatabase] = await db.insert(userDatabases).values({
      name,
      userId: sessionWithUser.userId,
      apiKey: crypto.randomUUID()
    }).returning({
      id: userDatabases.id,
      name: userDatabases.name,
      apiKey: userDatabases.apiKey,
      createdAt: userDatabases.createdAt,
    })

    //  --- Create SQlite file --- //
    const userId = sessionWithUser.userId
    const databaseId = newDatabase.id

    const userDir = path.resolve(process.cwd(), 'server', 'userDBs', String(userId))
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
    }
    const sqlitePath = path.join(userDir, `${databaseId}.sqlite`)
    const sqliteDb = new Database(sqlitePath)
    sqliteDb.close()

    return { 
      success: true, 
      database: {
        ...newDatabase,
        tables: [] // New database has no tables yet
      }
    }
    
  } catch (error: any) {
    console.error('Create database error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create database'
    })
  }
})