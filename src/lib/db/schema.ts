import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const roles = ['bot', 'user'] as const;
export type Role = typeof roles[number];

export const transcriptions = sqliteTable('transcriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  command: text('command'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  user: text('user').notNull().default('user'),
  role: text('role', { enum: roles }).notNull().default('user'),
});
