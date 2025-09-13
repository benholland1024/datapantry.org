import { pgTable, serial, varchar, timestamp, boolean, integer, text, jsonb } from 'drizzle-orm/pg-core'

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
export const databases = pgTable('databases', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// User-created tables within databases
export const tables = pgTable('tables', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  databaseId: integer('database_id').notNull().references(() => databases.id),
  columns: jsonb('columns').$type<Array<{name: string, datatype: string}>>(), // Store column definitions
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// User-created rows within tables
export const rows = pgTable('rows', {
  id: serial('id').primaryKey(),
  tableId: integer('table_id').notNull().references(() => tables.id),
  data: jsonb('data').$type<Record<string, any>>(), // Store actual row data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Database = typeof databases.$inferSelect
export type Table = typeof tables.$inferSelect
export type Row = typeof rows.$inferSelect