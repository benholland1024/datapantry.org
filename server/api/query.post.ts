/**
 * POST /api/query
 *
 * Execute a custom SQL query on a specified database.
 * This is the public API route, allowing users to read or modify their database rows. 
 * Editing database structure (tables, columns) is not allowed here.
 *
 * Headers:
 * - APIkey: string (required)
 * 
 * Body:
 * - query: string (required)
 * - parameters: any[] (optional)
 */

import Database from 'better-sqlite3'
import path from 'path'
import { userDatabases } from '../postgresDB/schema'
import { db } from '../postgresDB'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const apiKey = getHeader(event, 'apikey') as string
    const { query, parameters } = await readBody(event)

    if (!apiKey || !query) {
      throw createError({
        statusCode: 400,
        statusMessage: 'API key and query are required'
      })
    }

    // Validate API key and get database path
    const [userDatabase] = await db
      .select()
      .from(userDatabases)
      .where(eq(userDatabases.apiKey, apiKey))
      .limit(1)

    if (!userDatabase) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid API key'
      })
    }

    const sqlitePath = path.resolve(
      process.cwd(),
      'server',
      'userDBs',
      String(userDatabase.userId),
      `${userDatabase.id}.sqlite`
    )
    const sqliteDb = new Database(sqlitePath)

    //  Check query for disallowed statements
    const dangerousKeywords = /^\s*(ALTER|DROP|CREATE|TRUNCATE|RENAME)\s+/i
    if (dangerousKeywords.test(query)) {
      throw createError({ 
        statusCode: 403, 
        statusMessage: 'Schema modifications not allowed via API. Use the DataPantry dashboard.' 
      })
    }

    // Validate parameters
    const placeholderCount = (query.match(/\?/g) || []).length
    const paramCount = parameters ? parameters.length : 0
    if (placeholderCount !== paramCount) {
      throw createError({ statusCode: 400, statusMessage: 'Parameter count mismatch' })
    }


    // Execute query
    let stmt, params
    try {
      stmt = sqliteDb.prepare(query)
      params = parameters || []
    } catch (sqlError: any) {
    throw createError({
      statusCode: 400,
      statusMessage: `SQL Error: ${sqlError.message}`
    })
}

    let result
    if (stmt.reader) {
      // SELECT queries
      result = stmt.all(...params)
    } else {
      // INSERT, UPDATE, DELETE queries
      const info = stmt.run(...params)
      result = { 
        changes: info.changes, 
        lastInsertRowid: info.lastInsertRowid 
      }
    }

    sqliteDb.close() 

    return { success: true, result }
  } catch (error: any) {
    console.error('Error executing query:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error'
    })
  }
})