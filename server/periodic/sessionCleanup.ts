//  This is added to package.json. It should be run via cron job:
//  0 2 * * * cd /path/to/your/app && npm run cleanup:sessions >> /var/log/session-cleanup.log 2>&1

import { db } from '../postgresDB'
import { sessions } from '../postgresDB/schema'
import { lt } from 'drizzle-orm'

async function cleanupExpiredSessions() {
  try {
    console.log('Starting session cleanup...')
    
    const result = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
    
    console.log(`Cleaned up expired sessions at ${new Date().toISOString()}`)
    process.exit(0)
  } catch (error) {
    console.error('Session cleanup failed:', error)
    process.exit(1)
  }
}

cleanupExpiredSessions()