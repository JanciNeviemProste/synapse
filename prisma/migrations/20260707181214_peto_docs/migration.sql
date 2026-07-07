-- CreateTable
CREATE TABLE "PetoDoc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetoDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetoDoc_createdAt_idx" ON "PetoDoc"("createdAt");
