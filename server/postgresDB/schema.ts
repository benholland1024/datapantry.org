import { 
  pgTable, 
  serial, 
  varchar, 
  timestamp, 
  boolean, 
  integer, 
  primaryKey,
  text, 
  jsonb 
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(), // UUID or random string
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// User-created databases
export const userDatabases = pgTable('databases', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  apiKey: varchar('api_key', { length: 36 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const userTablePositions = pgTable('user_table_positions', {
  databaseId: integer('database_id').notNull().references(() => userDatabases.id),
  name: varchar('name', { length: 255 }).notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.databaseId, table.name] }),
])

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const passwordResetRequestIPs = pgTable('password_reset_request_ips', {
  id: serial('id').primaryKey(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(), // Supports IPv6
  createdAt: timestamp('created_at').defaultNow(),
})


export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type UserDatabase = typeof userDatabases.$inferSelect
export type UserTablePosition = typeof userTablePositions.$inferSelect
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type PasswordResetRequestIP = typeof passwordResetRequestIPs.$inferSelect