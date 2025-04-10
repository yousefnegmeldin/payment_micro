-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "price" INTEGER,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "user_booking_id" INTEGER,
    "checkout_url" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_booking_id" ON "payments"("user_booking_id");
