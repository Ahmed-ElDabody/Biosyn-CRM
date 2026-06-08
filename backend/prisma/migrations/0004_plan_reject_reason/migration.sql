-- Add reject_reason to weekly_plans (spec §8 — manager rejection needs a reason).
ALTER TABLE "weekly_plans" ADD COLUMN "reject_reason" TEXT;
