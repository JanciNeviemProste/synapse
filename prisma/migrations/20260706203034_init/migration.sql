-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DesignTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CloneStatus" AS ENUM ('PENDING', 'SCRAPING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentSessionType" AS ENUM ('QUICK_VOICE_NOTE', 'AI_INTERVIEW', 'TEXT_NOTE', 'AUDIO_UPLOAD');

-- CreateEnum
CREATE TYPE "ContentSessionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentIdeaStatus" AS ENUM ('NEW', 'APPROVED', 'CONVERTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InspirationType" AS ENUM ('INSTAGRAM_PROFILE', 'INSTAGRAM_REEL', 'SCREENSHOT', 'VIDEO_UPLOAD', 'TRANSCRIPT', 'MANUAL_NOTE');

-- CreateEnum
CREATE TYPE "ContentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentItemStatus" AS ENUM ('IDEA', 'PLANNED', 'SCRIPT_DRAFT', 'WAITING_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'READY_FOR_VIDEO', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReelScriptStatus" AS ENUM ('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'EDITED', 'APPROVED', 'REJECTED', 'READY_FOR_VIDEO', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StylePreferenceStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ContentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VideoAnalysisStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'ANALYZING_SCENES', 'ANALYZING_CONTENT', 'GENERATING_INSIGHTS', 'READY_FOR_REVIEW', 'APPROVED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DnaRuleStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "profileUrl" TEXT,
    "postUrl" TEXT,
    "messengerUrl" TEXT,
    "groupName" TEXT,
    "postSummary" TEXT NOT NULL,
    "publicComment" TEXT,
    "privateMessage" TEXT,
    "source" TEXT NOT NULL DEFAULT 'facebook',
    "category" TEXT,
    "confidence" DOUBLE PRECISION,
    "researchSummary" TEXT,
    "trustScore" INTEGER DEFAULT 0,
    "linkedinUrl" TEXT,
    "companyName" TEXT,
    "companyRegNumber" TEXT,
    "companyInfo" TEXT,
    "companyRevenue" TEXT,
    "companyFoundedYear" INTEGER,
    "clientWebsite" TEXT,
    "socialProfiles" TEXT,
    "webAnalysis" TEXT,
    "priceEstimate" TEXT,
    "heatScore" INTEGER NOT NULL DEFAULT 10,
    "linkOpened" BOOLEAN NOT NULL DEFAULT false,
    "linkOpenedAt" TIMESTAMP(3),
    "formStarted" BOOLEAN NOT NULL DEFAULT false,
    "formCompleted" BOOLEAN NOT NULL DEFAULT false,
    "previewGenerated" BOOLEAN NOT NULL DEFAULT false,
    "previewViews" INTEGER NOT NULL DEFAULT 0,
    "previewTotalTime" INTEGER NOT NULL DEFAULT 0,
    "lastPreviewViewAt" TIMESTAMP(3),
    "messageVariant" TEXT,
    "responseType" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "contactedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "followUpSentAt" TIMESTAMP(3),
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "emailMessageId" TEXT,
    "rawEmailSnippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileUrl" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessagePerformance" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "toneStyle" TEXT,
    "phraseUsed" TEXT,
    "linkType" TEXT,
    "resultAction" TEXT,
    "convertedToCall" BOOLEAN NOT NULL DEFAULT false,
    "convertedToSale" BOOLEAN NOT NULL DEFAULT false,
    "saleAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessagePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "meetLink" TEXT,
    "calendarEventId" TEXT,
    "leadId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoderTask" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'telegram',
    "telegramChatId" TEXT,
    "command" TEXT NOT NULL DEFAULT 'code',
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "generatedFiles" TEXT,
    "repoUrl" TEXT,
    "deployUrl" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CoderTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignTask" (
    "id" TEXT NOT NULL,
    "figmaUrl" TEXT NOT NULL,
    "figmaFileKey" TEXT NOT NULL,
    "figmaNodeIds" TEXT,
    "fileName" TEXT,
    "submittedBy" TEXT NOT NULL DEFAULT 'telegram',
    "status" "DesignTaskStatus" NOT NULL DEFAULT 'PENDING',
    "generatedCode" TEXT,
    "outputPath" TEXT,
    "previewUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "DesignTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloneRequest" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessField" TEXT NOT NULL,
    "businessInfo" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "clientPhone" TEXT,
    "leadId" TEXT,
    "trackingRef" TEXT,
    "status" "CloneStatus" NOT NULL DEFAULT 'PENDING',
    "previewUrl" TEXT,
    "generatedHtml" TEXT,
    "screenshotPath" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CloneRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "industry" TEXT,
    "targetAudience" TEXT,
    "communicationStyle" TEXT,
    "addressing" TEXT NOT NULL DEFAULT 'tykanie',
    "preferredPhrases" JSONB,
    "forbiddenPhrases" JSONB,
    "requiredCtas" JSONB,
    "humorLevel" INTEGER NOT NULL DEFAULT 3,
    "formalityLevel" INTEGER NOT NULL DEFAULT 3,
    "energyLevel" INTEGER NOT NULL DEFAULT 3,
    "trustRules" TEXT,
    "complianceNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDoc" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "tags" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSession" (
    "id" TEXT NOT NULL,
    "type" "ContentSessionType" NOT NULL,
    "title" TEXT,
    "status" "ContentSessionStatus" NOT NULL DEFAULT 'PENDING',
    "transcript" TEXT,
    "summary" TEXT,
    "extractedData" JSONB,
    "durationSeconds" INTEGER,
    "audioStoragePath" TEXT,
    "saveAudio" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "keyMessage" TEXT,
    "suggestedGoal" TEXT,
    "suggestedPillarId" TEXT,
    "suggestedTemplateId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'text_note',
    "status" "ContentIdeaStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "structure" JSONB NOT NULL,
    "recommendedGoal" TEXT,
    "recommendedLength" TEXT,
    "recommendedStyle" TEXT,
    "recommendedEmotion" TEXT,
    "hookPattern" TEXT,
    "bodyPattern" TEXT,
    "ctaPattern" TEXT,
    "complianceRules" TEXT,
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspirationSource" (
    "id" TEXT NOT NULL,
    "type" "InspirationType" NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "storagePath" TEXT,
    "transcript" TEXT,
    "userNotes" TEXT,
    "extractedPatterns" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspirationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPillar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targetFrequency" TEXT,
    "complianceNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "postsPerWeek" INTEGER NOT NULL DEFAULT 3,
    "goals" JSONB,
    "status" "ContentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "generationContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPlanItem" (
    "id" TEXT NOT NULL,
    "contentPlanId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "workingTitle" TEXT NOT NULL,
    "topic" TEXT,
    "pillarId" TEXT,
    "templateId" TEXT,
    "goal" TEXT,
    "targetAudience" TEXT,
    "length" TEXT,
    "style" TEXT,
    "emotion" TEXT,
    "suggestedHook" TEXT,
    "cta" TEXT,
    "status" "ContentItemStatus" NOT NULL DEFAULT 'IDEA',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelScript" (
    "id" TEXT NOT NULL,
    "contentPlanItemId" TEXT,
    "contentIdeaId" TEXT,
    "versionName" TEXT NOT NULL DEFAULT 'A',
    "strategy" JSONB,
    "hook" TEXT,
    "setup" TEXT,
    "mainMessage" TEXT,
    "keyInsight" TEXT,
    "cta" TEXT,
    "spokenScript" TEXT,
    "productionPlan" JSONB,
    "instagramAssets" JSONB,
    "safety" JSONB,
    "reviewerScores" JSONB,
    "reviewerFeedback" JSONB,
    "status" "ReelScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StylePreference" (
    "id" TEXT NOT NULL,
    "sourceScriptId" TEXT,
    "preferenceType" TEXT NOT NULL,
    "preferenceValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" "StylePreferenceStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StylePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "status" "ContentJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "result" JSONB,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVideoAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "sourceUrl" TEXT,
    "storagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "status" "VideoAnalysisStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVideoAnalysis" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "status" "VideoAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "language" TEXT,
    "transcript" TEXT,
    "summary" JSONB,
    "contentStructure" JSONB,
    "creativeAnalysis" JSONB,
    "reusableInsights" JSONB,
    "aiScores" JSONB,
    "performanceHypotheses" JSONB,
    "evidenceLevel" TEXT,
    "providerMetadata" JSONB,
    "errorMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVideoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVideoSegment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "transcriptText" TEXT,
    "visualDescription" TEXT,
    "onScreenText" TEXT,
    "editingEvents" JSONB,
    "delivery" JSONB,
    "purpose" TEXT,
    "attentionMechanism" TEXT,
    "confidence" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVideoSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVideoMetric" (
    "id" TEXT NOT NULL,
    "videoAssetId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "followerCountAtPublish" INTEGER,
    "views" INTEGER,
    "reach" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "averageWatchTimeSeconds" DOUBLE PRECISION,
    "completionRate" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVideoMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDnaProfile" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "evidenceVideoCount" INTEGER NOT NULL DEFAULT 0,
    "dna" JSONB,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDnaProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDnaRule" (
    "id" TEXT NOT NULL,
    "contentDnaProfileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" "DnaRuleStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDnaRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_emailMessageId_key" ON "Lead"("emailMessageId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Note_leadId_idx" ON "Note"("leadId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");

-- CreateIndex
CREATE INDEX "Booking_dateTime_idx" ON "Booking"("dateTime");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "CoderTask_status_idx" ON "CoderTask"("status");

-- CreateIndex
CREATE INDEX "CoderTask_createdAt_idx" ON "CoderTask"("createdAt");

-- CreateIndex
CREATE INDEX "DesignTask_status_idx" ON "DesignTask"("status");

-- CreateIndex
CREATE INDEX "DesignTask_createdAt_idx" ON "DesignTask"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CloneRequest_trackingRef_key" ON "CloneRequest"("trackingRef");

-- CreateIndex
CREATE INDEX "CloneRequest_status_idx" ON "CloneRequest"("status");

-- CreateIndex
CREATE INDEX "CloneRequest_createdAt_idx" ON "CloneRequest"("createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeDoc_category_idx" ON "KnowledgeDoc"("category");

-- CreateIndex
CREATE INDEX "KnowledgeDoc_isActive_idx" ON "KnowledgeDoc"("isActive");

-- CreateIndex
CREATE INDEX "ContentSession_status_idx" ON "ContentSession"("status");

-- CreateIndex
CREATE INDEX "ContentSession_createdAt_idx" ON "ContentSession"("createdAt");

-- CreateIndex
CREATE INDEX "ContentIdea_status_idx" ON "ContentIdea"("status");

-- CreateIndex
CREATE INDEX "ContentIdea_createdAt_idx" ON "ContentIdea"("createdAt");

-- CreateIndex
CREATE INDEX "ScriptTemplate_isArchived_idx" ON "ScriptTemplate"("isArchived");

-- CreateIndex
CREATE INDEX "InspirationSource_type_idx" ON "InspirationSource"("type");

-- CreateIndex
CREATE INDEX "ContentPillar_isActive_idx" ON "ContentPillar"("isActive");

-- CreateIndex
CREATE INDEX "ContentPlan_status_idx" ON "ContentPlan"("status");

-- CreateIndex
CREATE INDEX "ContentPlanItem_contentPlanId_idx" ON "ContentPlanItem"("contentPlanId");

-- CreateIndex
CREATE INDEX "ContentPlanItem_status_idx" ON "ContentPlanItem"("status");

-- CreateIndex
CREATE INDEX "ContentPlanItem_scheduledDate_idx" ON "ContentPlanItem"("scheduledDate");

-- CreateIndex
CREATE INDEX "ReelScript_status_idx" ON "ReelScript"("status");

-- CreateIndex
CREATE INDEX "ReelScript_contentPlanItemId_idx" ON "ReelScript"("contentPlanItemId");

-- CreateIndex
CREATE INDEX "ReelScript_contentIdeaId_idx" ON "ReelScript"("contentIdeaId");

-- CreateIndex
CREATE INDEX "StylePreference_status_idx" ON "StylePreference"("status");

-- CreateIndex
CREATE INDEX "StylePreference_preferenceType_idx" ON "StylePreference"("preferenceType");

-- CreateIndex
CREATE INDEX "ContentJob_status_scheduledAt_idx" ON "ContentJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ContentJob_type_idx" ON "ContentJob"("type");

-- CreateIndex
CREATE INDEX "ContentVideoAsset_status_idx" ON "ContentVideoAsset"("status");

-- CreateIndex
CREATE INDEX "ContentVideoAsset_createdAt_idx" ON "ContentVideoAsset"("createdAt");

-- CreateIndex
CREATE INDEX "ContentVideoAnalysis_videoAssetId_idx" ON "ContentVideoAnalysis"("videoAssetId");

-- CreateIndex
CREATE INDEX "ContentVideoAnalysis_status_idx" ON "ContentVideoAnalysis"("status");

-- CreateIndex
CREATE INDEX "ContentVideoSegment_analysisId_sortOrder_idx" ON "ContentVideoSegment"("analysisId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContentVideoMetric_videoAssetId_idx" ON "ContentVideoMetric"("videoAssetId");

-- CreateIndex
CREATE INDEX "ContentDnaProfile_status_idx" ON "ContentDnaProfile"("status");

-- CreateIndex
CREATE INDEX "ContentDnaRule_contentDnaProfileId_idx" ON "ContentDnaRule"("contentDnaProfileId");

-- CreateIndex
CREATE INDEX "ContentDnaRule_status_idx" ON "ContentDnaRule"("status");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ContentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPlanItem" ADD CONSTRAINT "ContentPlanItem_contentPlanId_fkey" FOREIGN KEY ("contentPlanId") REFERENCES "ContentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelScript" ADD CONSTRAINT "ReelScript_contentPlanItemId_fkey" FOREIGN KEY ("contentPlanItemId") REFERENCES "ContentPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelScript" ADD CONSTRAINT "ReelScript_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVideoAnalysis" ADD CONSTRAINT "ContentVideoAnalysis_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "ContentVideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVideoSegment" ADD CONSTRAINT "ContentVideoSegment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ContentVideoAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVideoMetric" ADD CONSTRAINT "ContentVideoMetric_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "ContentVideoAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDnaRule" ADD CONSTRAINT "ContentDnaRule_contentDnaProfileId_fkey" FOREIGN KEY ("contentDnaProfileId") REFERENCES "ContentDnaProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
