/**
 * Snowdonia Way — content for both states of /snowdonia-way.
 *
 * The page has two states and one URL, so a link shared today is the same
 * link that goes live in October:
 *
 *   teaser  — what's coming: the route, the history, how to follow it
 *   live    — the tracker, the conditions card, the daily films
 *
 * Everything visible lives here rather than in the components, so the facts,
 * the stages and the copy are all one edit away.
 *
 * PROSE IS PLACEHOLDER. Anything marked [TOBY] is scaffolding for him to
 * rewrite; the facts (distances, heights, history) are drafted from the plan
 * and can stand, but they are data, not markup.
 */

import { SNOWDONIA } from '../site';

export type PageMode = 'teaser' | 'live';

/**
 * Which state to render.
 *
 * Defaults to the date: teaser until the expedition starts, live from then.
 * `SITE_SNOWDONIA_MODE=live|teaser` overrides it for a preview or to go live
 * early.
 *
 * This is evaluated at build time, so the switch happens on the first build
 * on or after the start date. `.github/workflows/deploy.yml` rebuilds daily
 * so that happens without anyone remembering to do it.
 */
function resolveMode(): PageMode {
  const forced = import.meta.env.SITE_SNOWDONIA_MODE;
  if (forced === 'live' || forced === 'teaser') return forced;
  return Date.now() >= new Date(SNOWDONIA.startDate).getTime() ? 'live' : 'teaser';
}

export const MODE: PageMode = resolveMode();

export const TEASER = {
  eyebrow: 'Next expedition · October 2026',
  /** Working title — Toby may retitle around Snowdon / Everest / Crib Goch. */
  title: 'The Snowdonia Way',
  standfirst:
    'Northern Snowdonia, end to end: Beddgelert to the sea at Conwy. Solo, self-supported, five days.',
  pill: 'GOES LIVE · OCT 2026',
} as const;

/** Headline figures. Same component and grid as the Coast to Coast stats. */
export const SNOWDONIA_FACTS = [
  { n: '44', l: 'Miles' },
  { n: '11,000', l: 'Ft ascent, approx' },
  { n: '5', l: 'Days' },
  { n: '1,085m', l: 'Yr Wyddfa · summit of Wales' },
  { n: '1', l: 'Wild camp' },
  { n: 'Solo', l: 'Self-supported' },
] as const;

/** The Leg 1 plan, day by day. */
export const STAGES = [
  {
    day: 1,
    stage: 'Beddgelert → Pen-y-Gwryd',
    miles: '8.5 mi',
    character: 'The walk-in, up Nant Gwynant',
  },
  {
    day: 2,
    stage: 'Crib Goch → Yr Wyddfa',
    miles: '7.5 mi',
    character: 'The crux — guided, daysack',
  },
  {
    day: 3,
    stage: 'Glyders → Llyn y Caseg-fraith',
    miles: '7 mi',
    character: 'The night out',
  },
  {
    day: 4,
    stage: 'Trefriw, via Llyn Crafnant',
    miles: '10.5 mi',
    character: 'The long green valley',
  },
  {
    day: 5,
    stage: 'Conwy',
    miles: '9.5 mi',
    character: 'Castle walls and the sea',
  },
] as const;

/**
 * Two short history blocks. Facts are drafted and checkable; the wording is
 * placeholder. Crib Goch is framed as respect for the mountain, not bravado —
 * keep it that way.
 */
export const HISTORY = [
  {
    eyebrow: 'The Pen-y-Gwryd',
    title: 'Where Everest was trained for',
    body: [
      'The 1953 Everest team used this inn as a training base, and signed the ceiling of the smoke room when they came back. The signatures are still there.',
      'Toby stays two nights and walks the hardest day of the route from its front door — the same ground, in the same weather, with rather less at stake.',
    ],
  },
  {
    eyebrow: 'Crib Goch',
    title: 'The knife edge',
    body: [
      'A Grade 1 scramble along a genuine arête, and the most famous stretch of ridge in Wales. There is no easy way off it once you are committed.',
      'He crosses with a mountain guide, and the decision is made on the morning, on the wind. If it is the wrong day, the mountain keeps it — that is the whole point.',
    ],
  },
] as const;

/**
 * Photo band. Empty styled slots ship until Toby supplies photographs — his
 * own, or properly licensed. Do not fill these with stock imagery.
 *
 * To add one: put the file in src/assets/snowdonia/, import it at the top of
 * this file, and set `image`.
 */
export const PHOTO_SLOTS = [
  {
    caption: 'Crib Goch, looking along the arête',
    alt: 'The Crib Goch ridge',
    image: null,
  },
  {
    caption: 'The Pen-y-Gwryd — the Everest team’s training base',
    alt: 'The Pen-y-Gwryd hotel',
    image: null,
  },
  {
    caption: 'Llyn y Caseg-fraith, under Tryfan — the wild camp',
    alt: 'Llyn y Caseg-fraith with Tryfan behind',
    image: null,
  },
  {
    caption: 'Conwy castle from the estuary — the finish',
    alt: 'Conwy castle seen across the estuary',
    image: null,
  },
] as const;

/** The closing section: what following along actually gets you. */
export const FOLLOW = {
  eyebrow: 'Follow it live',
  title: 'From the first morning',
  points: [
    'Live satellite tracking, updated every ten minutes from the inReach.',
    'A film from the hill each evening, uploaded on whatever signal there is.',
    "The morning's conditions — wind on the ridges, cloud base, and the call he has to make.",
  ],
} as const;
