-- CreateEnum
CREATE TYPE "MonthlySummaryStatus" AS ENUM ('EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "monthly_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reference_month" INTEGER NOT NULL,
    "reference_year" INTEGER NOT NULL,
    "total_income" BIGINT NOT NULL DEFAULT 0,
    "total_expenses" BIGINT NOT NULL DEFAULT 0,
    "total_balance" BIGINT NOT NULL DEFAULT 0,
    "bills_to_pay" BIGINT NOT NULL DEFAULT 0,
    "bills_count" INTEGER NOT NULL DEFAULT 0,
    "status" "MonthlySummaryStatus" NOT NULL DEFAULT 'GOOD',
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_summaries_user_id_idx" ON "monthly_summaries"("user_id");

-- CreateIndex
CREATE INDEX "monthly_summaries_reference_year_reference_month_idx" ON "monthly_summaries"("reference_year", "reference_month");

-- CreateIndex
CREATE INDEX "monthly_summaries_last_calculated_at_idx" ON "monthly_summaries"("last_calculated_at");

-- CreateIndex
CREATE INDEX "monthly_summaries_status_idx" ON "monthly_summaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_summaries_user_id_reference_year_reference_month_key" ON "monthly_summaries"("user_id", "reference_year", "reference_month");
