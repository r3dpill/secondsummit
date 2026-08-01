import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts, postUrl } from '../lib/posts';
import { SITE } from '../site';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();

  return rss({
    title: `${SITE.title} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
      categories: [post.data.category],
    })),
    customData: '<language>en-gb</language>',
  });
};
