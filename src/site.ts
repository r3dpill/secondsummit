/**
 * Single source of truth for site-wide constants.
 * Editing values here is safe; everything else reads from it.
 */

export const SITE = {
  title: 'Second Summit',
  tagline: 'Long walks, done properly, filmed honestly.',
  description:
    'Long routes walked self-supported, tracked live and filmed honestly. The Coast to Coast archive and the Snowdonia Way expedition, from Toby Wise.',
  url: 'https://secondsummit.uk',
  author: 'Toby Wise',
  locale: 'en_GB',
} as const;

/**
 * Page theme. Dark is the chosen look; the light palette is kept in
 * src/styles/global.css and can be built with SITE_THEME=light if it is ever
 * wanted back.
 */
export const THEME: 'light' | 'dark' =
  import.meta.env.SITE_THEME === 'light' ? 'light' : 'dark';

/** Browser chrome colour — matches the header band in each theme. */
export const THEME_COLOR = THEME === 'dark' ? '#141B20' : '#28343B';

/**
 * TODO(Toby): confirm the address to publish. This is the only contact point on
 * the site (brief: "a one-line contact mention"). Left as the address on file
 * until you say otherwise — change it here and it updates everywhere.
 */
export const CONTACT_EMAIL = 'toby@wise-family.net';

/** Garmin inReach MapShare — live tracking iframe on /snowdonia-way. */
export const MAPSHARE_URL = 'https://share.garmin.com/tobywise';

/** YouTube channel; used for the "more films" link. */
export const YOUTUBE_CHANNEL = 'https://www.youtube.com/@tobywisefilm';

/**
 * Film embeds. Set `id` to a YouTube video ID to switch a placeholder to a real
 * embed — everything else about the card stays the same.
 */
export const FILMS = {
  /** Home page "latest film". */
  latest: {
    id: null as string | null,
    kicker: 'Coast to Coast · 2026',
    title: '174 miles across England: the full story',
  },
  /** /coast-to-coast expedition film. */
  coastToCoast: {
    id: null as string | null,
    kicker: 'Coast to Coast · 2026',
    title: 'The film',
  },
  /** /background piece-to-camera. */
  background: {
    id: null as string | null,
    kicker: 'The background',
    title: 'Why the second summit',
  },
  /**
   * AvoMap aerial fly-throughs, rendered from the route GPX. These export as
   * ordinary video files, so they go up on YouTube like everything else and
   * play through the same click-to-load embed — no new plumbing, and no
   * 4K file sitting in the repo.
   */
  flythroughCoastToCoast: {
    id: null as string | null,
    kicker: 'Coast to Coast · 2026',
    title: 'The route, coast to coast — aerial fly-through',
  },
  flythroughSnowdonia: {
    id: null as string | null,
    kicker: 'Snowdonia Way · 2026',
    title: 'The route from the air',
  },
} as const;

/** Bottom nav — four destinations, matching the prototype. */
export const NAV = [
  { href: '/', label: 'HOME', icon: '▲' },
  { href: '/snowdonia-way/', label: 'LIVE', icon: '●' },
  { href: '/coast-to-coast/', label: 'C2C', icon: '✓' },
  { href: '/background/', label: 'ABOUT', icon: '§' },
] as const;

/** Coast to Coast headline figures (brief §Site structure). */
export const C2C_STATS = [
  { n: '174', l: 'Miles' },
  { n: '23,180', l: 'Ft ascent' },
  { n: '16', l: 'Days' },
  { n: '4', l: 'Wild camps' },
  { n: '9', l: 'Pub nights' },
  { n: '1', l: 'Pebble, carried sea to sea' },
] as const;

/** Snowdonia Way, Leg 1 — northern half. */
export const SNOWDONIA = {
  strapline: 'Beddgelert → Conwy · 44 miles · 5 days · self-supported · October 2026',
  startDate: '2026-10-05',
} as const;

export const CATEGORIES = {
  'coast-to-coast': { label: 'Coast to Coast', href: '/coast-to-coast/' },
  'snowdonia-way': { label: 'Snowdonia Way', href: '/snowdonia-way/' },
  training: { label: 'Training', href: '/posts/' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
