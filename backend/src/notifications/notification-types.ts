// Canonical notification type strings. Notification.type is a free-form
// String column on purpose (open-ended). This list is the single source of
// truth for emitter call sites.

export const NOTIFICATION_TYPES = {
  PLAN_SUBMITTED: 'plan.submitted',
  PLAN_APPROVED: 'plan.approved',
  PLAN_REJECTED: 'plan.rejected',
  PLAN_MISSED_APPROVAL: 'plan.missed_approval',
  LIST_CHANGE_SUBMITTED: 'list_change.submitted',
  LIST_CHANGE_MANAGER_APPROVED: 'list_change.manager_approved',
  LIST_CHANGE_MANAGER_REJECTED: 'list_change.manager_rejected',
  LIST_CHANGE_ADMIN_APPLIED: 'list_change.admin_applied',
  LIST_CHANGE_ADMIN_REJECTED: 'list_change.admin_rejected',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
