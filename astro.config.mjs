// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://secondsummit.uk',
  // /post is the private field-posting form — keep it out of the sitemap as
  // well as out of robots.txt.
  integrations: [sitemap({ filter: (page) => !page.includes('/post/') })],
  // /post and the GitHub-commit API are Cloudflare Pages Functions (see functions/),
  // so the Astro build itself stays fully static.
  output: 'static',
  build: {
    format: 'directory',
  },
  image: {
    // The imported WordPress photos are 2000px+ originals and the audience is
    // on phones on mobile data. `constrained` makes every image — including
    // the ones inside imported markdown — emit a srcset off these breakpoints
    // instead of a single full-size file.
    layout: 'constrained',
    breakpoints: [320, 480, 640, 828, 1080, 1400],
    responsiveStyles: true,
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
