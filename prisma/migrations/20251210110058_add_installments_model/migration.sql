-- CreateTable
CREATE TABLE "installments" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "reference_month" INTEGER,
    "reference_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installments_account_id_idx" ON "installments"("account_id");

-- CreateIndex
CREATE INDEX "installments_due_date_idx" ON "installments"("due_date");

-- CreateIndex
CREATE INDEX "installments_is_paid_idx" ON "installments"("is_paid");

-- CreateIndex
CREATE INDEX "installments_number_idx" ON "installments"("number");

-- CreateIndex
CREATE INDEX "installments_reference_year_reference_month_idx" ON "installments"("reference_year", "reference_month");

-- CreateIndex
CREATE INDEX "installments_account_id_reference_year_reference_month_idx" ON "installments"("account_id", "reference_year", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "installments_account_id_number_key" ON "installments"("account_id", "number");

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
