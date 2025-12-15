-- CreateTable
CREATE TABLE "credit_card_items" (
    "id" UUID NOT NULL,
    "credit_card_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_card_items_credit_card_id_idx" ON "credit_card_items"("credit_card_id");

-- CreateIndex
CREATE INDEX "credit_card_items_account_id_idx" ON "credit_card_items"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_items_credit_card_id_account_id_key" ON "credit_card_items"("credit_card_id", "account_id");

-- AddForeignKey
ALTER TABLE "credit_card_items" ADD CONSTRAINT "credit_card_items_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_items" ADD CONSTRAINT "credit_card_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
