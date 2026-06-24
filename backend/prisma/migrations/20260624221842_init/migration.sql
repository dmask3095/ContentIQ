-- CreateTable
CREATE TABLE "research_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "full_url" TEXT NOT NULL,
    "source_url" TEXT,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "embedding" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ideas" (
    "id" TEXT NOT NULL,
    "research_item_ids" TEXT NOT NULL DEFAULT '[]',
    "format" TEXT NOT NULL,
    "concept_variation" INTEGER NOT NULL DEFAULT 1,
    "ai_generated_caption" TEXT NOT NULL,
    "ai_hook" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "user_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "carousel_slides" TEXT,
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "user_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "published_posts" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "instagram_post_id" TEXT,
    "format" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "last_synced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "published_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hashtags_trending" (
    "id" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "search_volume" INTEGER NOT NULL DEFAULT 0,
    "growth_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hashtags_trending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "research_sweep_time" TEXT NOT NULL DEFAULT '08:00',
    "research_sweep_enabled" BOOLEAN NOT NULL DEFAULT true,
    "data_sources_enabled" TEXT NOT NULL DEFAULT '{"google":true,"rss":true,"scrape":true}',
    "content_categories" TEXT NOT NULL DEFAULT '["AI News","AI Tools","Trends","Tips"]',
    "relevance_threshold" INTEGER NOT NULL DEFAULT 5,
    "email_digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_digest_frequency" TEXT NOT NULL DEFAULT 'daily',
    "slack_enabled" BOOLEAN NOT NULL DEFAULT false,
    "slack_webhook_url" TEXT,
    "slack_channel" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "best_posting_times" TEXT NOT NULL DEFAULT '{}',
    "content_mix_goal" TEXT NOT NULL DEFAULT '{"reels":40,"carousels":40,"stories":20}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_items_source_idx" ON "research_items"("source");

-- CreateIndex
CREATE INDEX "research_items_category_idx" ON "research_items"("category");

-- CreateIndex
CREATE INDEX "research_items_discovered_at_idx" ON "research_items"("discovered_at");

-- CreateIndex
CREATE INDEX "content_ideas_format_idx" ON "content_ideas"("format");

-- CreateIndex
CREATE UNIQUE INDEX "content_drafts_idea_id_key" ON "content_drafts"("idea_id");

-- CreateIndex
CREATE INDEX "content_drafts_status_idx" ON "content_drafts"("status");

-- CreateIndex
CREATE INDEX "content_drafts_format_idx" ON "content_drafts"("format");

-- CreateIndex
CREATE INDEX "content_drafts_scheduled_date_idx" ON "content_drafts"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "published_posts_draft_id_key" ON "published_posts"("draft_id");

-- CreateIndex
CREATE INDEX "published_posts_published_at_idx" ON "published_posts"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "hashtags_trending_hashtag_key" ON "hashtags_trending"("hashtag");

-- CreateIndex
CREATE INDEX "hashtags_trending_category_idx" ON "hashtags_trending"("category");

-- CreateIndex
CREATE INDEX "hashtags_trending_is_favorite_idx" ON "hashtags_trending"("is_favorite");

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "content_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "content_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
