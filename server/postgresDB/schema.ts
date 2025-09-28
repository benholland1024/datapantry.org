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
  apiKey: varchar('api_key', { length: 36 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const userTables = pgTable('user_tables', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID is 36 chars
  databaseId: integer('database_id').notNull().references(() => databases.id),
  name: varchar('name', { length: 255 }).notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const userColumns = pgTable('user_columns', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  tableId: varchar('table_id', { length: 36 }).notNull().references(() => userTables.id),
  name: varchar('name', { length: 255 }).notNull(),
  datatype: varchar('datatype', { length: 100 }).notNull(),
  constraint: varchar('constraint', { length: 100 }).default('none'),
  isRequired: boolean('is_required').default(false),
  orderIndex: integer('order_index').notNull(),
  foreignKey: jsonb('foreign_key').$type<{tableId: number, columnName: string}>(),
  createdAt: timestamp('created_at').defaultNow(),
})

// User-created rows within tables
export const rows = pgTable('rows', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tableId: varchar('table_id', { length: 36 }).notNull().references(() => userTables.id),
  data: jsonb('data').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(), 
})

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Database = typeof databases.$inferSelect
export type UserTables = typeof userTables.$inferSelect
export type UserColumn = typeof userColumns.$inferSelect
export type Row = typeof rows.$inferSelect