import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { users } from './users.schema';

export const adminAuditLogs = pgTable('admin_audit_logs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    adminId: text('adminId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    targetUserId: text('targetUserId').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    details: jsonb('details').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
    adminIdIdx: index('idx_admin_audit_logs_admin_id').on(table.adminId),
    targetUserIdIdx: index('idx_admin_audit_logs_target_user_id').on(table.targetUserId),
    createdAtIdx: index('idx_admin_audit_logs_created_at').on(table.createdAt)
}));

export type AdminAuditLog = InferSelectModel<typeof adminAuditLogs>;
export type NewAdminAuditLog = InferInsertModel<typeof adminAuditLogs>;
