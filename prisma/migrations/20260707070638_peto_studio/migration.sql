-- CreateTable
CREATE TABLE "PetoBrand" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "industry" TEXT,
    "targetAudience" TEXT,
    "communicationStyle" TEXT,
    "addressing" TEXT NOT NULL DEFAULT 'tykanie',
    "preferredPhrases" JSONB,
    "forbiddenPhrases" JSONB,
    "requiredCtas" JSONB,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetoBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetoTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structure" TEXT,
    "hookPattern" TEXT,
    "ctaPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetoScript" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceTranscript" TEXT,
    "topic" TEXT,
    "versionName" TEXT NOT NULL DEFAULT 'A',
    "hook" TEXT,
    "setup" TEXT,
    "mainMessage" TEXT,
    "keyInsight" TEXT,
    "cta" TEXT,
    "spokenScript" TEXT,
    "productionPlan" JSONB,
    "instagramAssets" JSONB,
    "safety" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetoScript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetoTemplate_createdAt_idx" ON "PetoTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "PetoScript_batchId_idx" ON "PetoScript"("batchId");

-- CreateIndex
CREATE INDEX "PetoScript_createdAt_idx" ON "PetoScript"("createdAt");
