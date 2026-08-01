import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

const isPublished = (post: Post) =>
  import.meta.env.DEV || (!post.data.draft && post.data.pubDate <= new Date());

/** Newest first. Drafts and future-dated posts are hidden in production builds. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', isPublished);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export async function getPostsByCategory(category: Post['data']['category']): Promise<Post[]> {
  return (await getPosts()).filter((p) => p.data.category === category);
}

/**
 * Oldest first — the reading order for a day-by-day expedition index.
 * Posts carrying a `day` number sort by that; the rest fall back to date.
 */
export function inWalkOrder(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const dayA = a.data.day;
    const dayB = b.data.day;
    if (dayA != null && dayB != null) return dayA - dayB;
    return a.data.pubDate.getTime() - b.data.pubDate.getTime();
  });
}

export const postUrl = (post: Post) => `/posts/${post.id}/`;

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/London',
});

export const formatDate = (date: Date) => dateFormat.format(date);

const shortFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/London',
});

export const formatShortDate = (date: Date) => shortFormat.format(date);
