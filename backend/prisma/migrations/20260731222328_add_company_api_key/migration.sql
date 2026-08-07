-- AlterTable
ALTER TABLE "Company" ADD COLUMN "apiKeyHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_apiKeyHash_key" ON "Company"("apiKeyHash");
