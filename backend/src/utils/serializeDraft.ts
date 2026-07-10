import type { ContentDraft, PublishedPost } from '@prisma/client';

export function serializeDraft(draft: ContentDraft & { publishedPost?: PublishedPost | null }) {
  return {
    ...draft,
    hashtags: JSON.parse(draft.hashtags || '[]'),
    carouselSlides: draft.carouselSlides ? JSON.parse(draft.carouselSlides) : null,
  };
}
