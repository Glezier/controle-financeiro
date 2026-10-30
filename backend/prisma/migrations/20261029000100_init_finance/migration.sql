BEGIN;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('paid', 'pending');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_type_name_key" ON "categories"("user_id", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_user_id_type_key" ON "categories"("id", "user_id", "type");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_idx" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "transactions_user_id_type_status_date_idx" ON "transactions"("user_id", "type", "status", "date");

-- CreateIndex
CREATE INDEX "transactions_category_id_user_id_type_idx" ON "transactions"("category_id", "user_id", "type");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_user_id_type_fkey" FOREIGN KEY ("category_id", "user_id", "type") REFERENCES "categories"("id", "user_id", "type") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Impedir valores inválidos.
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_amount_positive
CHECK (amount > 0);

ALTER TABLE public.categories
ADD CONSTRAINT categories_name_not_blank
CHECK (length(trim(name)) > 0);

-- Vincular os registros aos usuários do Supabase Auth.
ALTER TABLE public.categories
ADD CONSTRAINT categories_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE RESTRICT
ON UPDATE RESTRICT;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE RESTRICT
ON UPDATE RESTRICT;

-- Habilitar isolamento por usuário.
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_owner_access
ON public.categories
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY transactions_owner_access
ON public.transactions
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;