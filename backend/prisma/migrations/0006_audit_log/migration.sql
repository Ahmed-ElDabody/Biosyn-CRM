-- Audit log for sensitive admin/manager actions (M10).
CREATE TABLE "audit_logs" (
  "id"          UUID         NOT NULL,
  "actor_id"    UUID,
  "action"      TEXT         NOT NULL,
  "target_type" TEXT,
  "target_id"   TEXT,
  "meta"        JSONB,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_id_idx"             ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_action_idx"               ON "audit_logs"("action");
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");
