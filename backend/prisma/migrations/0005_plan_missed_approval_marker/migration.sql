-- Add idempotency marker for the missed-plan-approval cron (spec §8).
ALTER TABLE "weekly_plans" ADD COLUMN "missed_approval_notified_at" TIMESTAMP(3);
