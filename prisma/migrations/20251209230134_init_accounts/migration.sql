-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('FIXED', 'LOAN', 'CREDIT_CARD', 'DEBIT_CARD', 'SUBSCRIPTION', 'INSURANCE', 'TAX', 'PENSION', 'EDUCATION', 'HEALTH', 'OTHER');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "AccountType" NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "total_amount" DECIMAL(10,2),
    "installments" INTEGER,
    "start_date" DATE NOT NULL,
    "due_day" INTEGER NOT NULL,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "reference_month" INTEGER,
    "reference_year" INTEGER,
    "credit_limit" DECIMAL(10,2),
    "credit_card_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
