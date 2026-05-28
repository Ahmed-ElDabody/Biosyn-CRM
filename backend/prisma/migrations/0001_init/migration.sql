-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('rep', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "DoctorStatus" AS ENUM ('active', 'pending', 'rejected');

-- CreateEnum
CREATE TYPE "DoctorClass" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('AM', 'PM');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('general_hospital', 'university_hospital', 'teaching_hospital', 'health_insurance', 'fever_hospital', 'chest_hospital', 'contracts', 'medical_center', 'private_clinic', 'poly_clinic', 'private_hospital');

-- CreateEnum
CREATE TYPE "WeeklyPlanStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'missed_deadline');

-- CreateEnum
CREATE TYPE "RepDoctorListStatus" AS ENUM ('active', 'pending_add', 'pending_delete');

-- CreateEnum
CREATE TYPE "ListChangeType" AS ENUM ('add_from_master', 'create_account', 'delete');

-- CreateEnum
CREATE TYPE "ListChangeStage" AS ENUM ('manager', 'admin', 'applied', 'rejected');

-- CreateEnum
CREATE TYPE "LockScope" AS ENUM ('global', 'per_rep');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "name_en" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "region" TEXT,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governorates" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bricks" (
    "id" UUID NOT NULL,
    "code" TEXT,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT,
    "area" TEXT,
    "governorate_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bricks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_bricks" (
    "id" UUID NOT NULL,
    "parent_brick_id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_bricks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "address_ar" TEXT,
    "specialty" TEXT NOT NULL,
    "class" "DoctorClass" NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "account_subtype" "AccountSubtype" NOT NULL,
    "brick_id" UUID,
    "governorate_id" UUID,
    "clinic_lat" DOUBLE PRECISION,
    "clinic_lng" DOUBLE PRECISION,
    "status" "DoctorStatus" NOT NULL DEFAULT 'pending',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rep_doctor_list" (
    "id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RepDoctorListStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rep_doctor_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "total_slides" INTEGER NOT NULL,
    "detail_aid_file_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_plans" (
    "id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "iso_week" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "WeeklyPlanStatus" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "planned_day" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "plan_item_id" UUID,
    "account_type" "AccountType" NOT NULL,
    "session_id" UUID,
    "started_at_server" TIMESTAMP(3) NOT NULL,
    "ended_at_server" TIMESTAMP(3),
    "started_at_client" TIMESTAMP(3),
    "ended_at_client" TIMESTAMP(3),
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "geofence_ok" BOOLEAN NOT NULL DEFAULT false,
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "validity_reasons" JSONB,
    "flags" JSONB,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "start_slide" INTEGER NOT NULL,
    "slides_seen" INTEGER NOT NULL,
    "max_slide" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "start_lat" DOUBLE PRECISION,
    "start_lng" DOUBLE PRECISION,
    "slide_events" JSONB NOT NULL,
    "device_info" JSONB,
    "mock_location_detected" BOOLEAN NOT NULL DEFAULT false,
    "clock_drift_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_change_requests" (
    "id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "doctor_id" UUID,
    "type" "ListChangeType" NOT NULL,
    "payload" JSONB,
    "stage" "ListChangeStage" NOT NULL DEFAULT 'manager',
    "manager_id" UUID,
    "manager_action_at" TIMESTAMP(3),
    "admin_id" UUID,
    "admin_action_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "list_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_locks" (
    "id" UUID NOT NULL,
    "scope" "LockScope" NOT NULL,
    "rep_id" UUID,
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "granted_by_admin" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_snapshots" (
    "id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "coverage_ach" DOUBLE PRECISION NOT NULL,
    "call_rate_ach" DOUBLE PRECISION NOT NULL,
    "frequency_ach" DOUBLE PRECISION NOT NULL,
    "crm_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "governorates_name_en_key" ON "governorates"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "bricks_code_key" ON "bricks"("code");

-- CreateIndex
CREATE INDEX "bricks_area_idx" ON "bricks"("area");

-- CreateIndex
CREATE UNIQUE INDEX "bricks_governorate_id_name_en_key" ON "bricks"("governorate_id", "name_en");

-- CreateIndex
CREATE UNIQUE INDEX "sub_bricks_parent_brick_id_name_en_key" ON "sub_bricks"("parent_brick_id", "name_en");

-- CreateIndex
CREATE INDEX "doctors_brick_id_idx" ON "doctors"("brick_id");

-- CreateIndex
CREATE INDEX "doctors_governorate_id_idx" ON "doctors"("governorate_id");

-- CreateIndex
CREATE INDEX "doctors_status_idx" ON "doctors"("status");

-- CreateIndex
CREATE INDEX "rep_doctor_list_status_idx" ON "rep_doctor_list"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rep_doctor_list_rep_id_doctor_id_key" ON "rep_doctor_list"("rep_id", "doctor_id");

-- CreateIndex
CREATE INDEX "weekly_plans_status_idx" ON "weekly_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_plans_rep_id_year_iso_week_key" ON "weekly_plans"("rep_id", "year", "iso_week");

-- CreateIndex
CREATE INDEX "plan_items_doctor_id_idx" ON "plan_items"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_items_plan_id_doctor_id_planned_day_key" ON "plan_items"("plan_id", "doctor_id", "planned_day");

-- CreateIndex
CREATE UNIQUE INDEX "visits_session_id_key" ON "visits"("session_id");

-- CreateIndex
CREATE INDEX "visits_rep_id_started_at_server_idx" ON "visits"("rep_id", "started_at_server");

-- CreateIndex
CREATE INDEX "visits_doctor_id_started_at_server_idx" ON "visits"("doctor_id", "started_at_server");

-- CreateIndex
CREATE INDEX "visits_is_valid_idx" ON "visits"("is_valid");

-- CreateIndex
CREATE INDEX "sessions_product_id_idx" ON "sessions"("product_id");

-- CreateIndex
CREATE INDEX "list_change_requests_rep_id_idx" ON "list_change_requests"("rep_id");

-- CreateIndex
CREATE INDEX "list_change_requests_stage_idx" ON "list_change_requests"("stage");

-- CreateIndex
CREATE INDEX "list_locks_scope_idx" ON "list_locks"("scope");

-- CreateIndex
CREATE INDEX "list_locks_rep_id_idx" ON "list_locks"("rep_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_snapshots_rep_id_period_key" ON "kpi_snapshots"("rep_id", "period");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bricks" ADD CONSTRAINT "bricks_governorate_id_fkey" FOREIGN KEY ("governorate_id") REFERENCES "governorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_bricks" ADD CONSTRAINT "sub_bricks_parent_brick_id_fkey" FOREIGN KEY ("parent_brick_id") REFERENCES "bricks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_brick_id_fkey" FOREIGN KEY ("brick_id") REFERENCES "bricks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_governorate_id_fkey" FOREIGN KEY ("governorate_id") REFERENCES "governorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_doctor_list" ADD CONSTRAINT "rep_doctor_list_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rep_doctor_list" ADD CONSTRAINT "rep_doctor_list_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_plan_item_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_change_requests" ADD CONSTRAINT "list_change_requests_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_change_requests" ADD CONSTRAINT "list_change_requests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_change_requests" ADD CONSTRAINT "list_change_requests_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_change_requests" ADD CONSTRAINT "list_change_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_locks" ADD CONSTRAINT "list_locks_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_locks" ADD CONSTRAINT "list_locks_granted_by_admin_fkey" FOREIGN KEY ("granted_by_admin") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_snapshots" ADD CONSTRAINT "kpi_snapshots_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

