-- AlterTable
ALTER TABLE "content_drafts" ADD COLUMN     "script" TEXT;

-- AlterTable
ALTER TABLE "content_ideas" ADD COLUMN     "ai_script" TEXT NOT NULL DEFAULT '';
