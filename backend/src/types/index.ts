// Re-export Prisma's generated model types rather than redefining them —
// they stay in sync with prisma/schema.prisma automatically.
export type {
  ResearchItem,
  ContentIdea,
  ContentDraft,
  PublishedPost,
  HashtagTrending,
  UserSettings,
} from '@prisma/client';

// Request/response DTOs for the API routes are added in STEP 3.
