-- CreateEnum
CREATE TYPE "TransactionCategoryType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateTable
CREATE TABLE "transaction_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "type" "TransactionCategoryType" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "pt_br" VARCHAR(100) NOT NULL,
    "en" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_categories_type_idx" ON "transaction_categories"("type");

-- CreateIndex
CREATE INDEX "transaction_categories_is_default_idx" ON "transaction_categories"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_categories_name_type_key" ON "transaction_categories"("name", "type");
