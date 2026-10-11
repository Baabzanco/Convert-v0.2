-- AlterTable
ALTER TABLE "page_seo" ADD COLUMN "draftSeo" JSONB,
ADD COLUMN "preferredH1" TEXT;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN "draftContent" JSONB,
ADD COLUMN "hasUnpublishedChanges" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastUpdatedById" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
