import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const transcriptions = sqliteTable('transcriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  command: text('command'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(Date.now()),
});