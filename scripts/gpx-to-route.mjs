/**
 * Turn a planning GPX into the three datasets the elevation tracker needs.
 *
 *   node scripts/gpx-to-route.mjs <route.gpx> [--sample 1.0] [--wp 0.25]
 *
 * Prints a ready-to-paste `route` array and `waypoints` array. The `days`
 * array still has to be written by hand — only you know where you are
 * sleeping — but the script reports the cumulative mileage at intervals so
 * the end-of-day miles are easy to read off.
 *
 * --sample  miles between elevation-profile points (default 1.0)
 * --wp      miles between GPS waypoints for live position (default 0.25)
 *
 * Elevations come from the GPX. Where a summit height matters, correct it to
 * the OS value by hand afterwards and add the label as a third element:
 *   [19.61, 597, "Haystacks"]
 */

import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};

if (!file) {
  console.error('usage: node scripts/gpx-to-route.mjs <route.gpx> [--sample 1.0] [--wp 0.25]');
  process.exit(1);
}

const SAMPLE_MI = flag('sample', 1.0);
const WAYPOINT_MI = flag('wp', 0.25);

const gpx = await readFile(file, 'utf8');

// <trkpt lat=".." lon=".."><ele>..</ele>
const points = [...gpx.matchAll(/<trkpt[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)].map(
  (m) => {
    const ele = /<ele>([-\d.]+)<\/ele>/.exec(m[3]);
    return { lat: Number(m[1]), lon: Number(m[2]), ele: ele ? Number(ele[1]) : 0 };
  },
);

if (points.length < 2) {
  console.error(`Found ${points.length} track points. Is this a GPX track (trkpt), not just waypoints?`);
  process.exit(1);
}

/** Great-circle distance in miles. */
function miles(a, b) {
  const R = 3958.7613;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Cumulative distance along the track.
let cum = 0;
points[0].mile = 0;
for (let i = 1; i < points.length; i++) {
  cum += miles(points[i - 1], points[i]);
  points[i].mile = cum;
}

const total = cum;

/** Take one point per `step` miles, always keeping the first and last. */
function sample(step) {
  const out = [points[0]];
  let next = step;
  for (const p of points) {
    if (p.mile >= next) {
      out.push(p);
      next = Math.ceil(p.mile / step) * step + step;
    }
  }
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

const r2 = (n) => Math.round(n * 100) / 100;

const profile = sample(SAMPLE_MI).map((p) => `  [${r2(p.mile)}, ${Math.round(p.ele)}],`);
const waypoints = sample(WAYPOINT_MI).map(
  (p) => `  [${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}, ${r2(p.mile)}],`,
);

// Total ascent, for the subtitle line.
let ascent = 0;
for (let i = 1; i < points.length; i++) {
  const d = points[i].ele - points[i - 1].ele;
  if (d > 0) ascent += d;
}

console.log(`// ${file}`);
console.log(`// ${points.length} track points · ${r2(total)} miles · ${Math.round(ascent * 3.28084)} ft ascent`);
console.log(`// profile sampled every ${SAMPLE_MI} mi, waypoints every ${WAYPOINT_MI} mi`);
console.log(`// max elevation ${Math.round(Math.max(...points.map((p) => p.ele)))} m\n`);

console.log(`  maxMile: ${Math.ceil(total * 1.03)},`);
console.log(`  maxElev: ${Math.ceil(Math.max(...points.map((p) => p.ele)) / 100) * 100},\n`);

console.log(`  route: [\n${profile.join('\n')}\n  ],\n`);
console.log(`  waypoints: [\n${waypoints.join('\n')}\n  ],\n`);

console.log('// Cumulative mileage every 5 miles, to help pick end-of-day markers:');
for (let m = 5; m < total; m += 5) {
  const p = points.find((pt) => pt.mile >= m);
  console.log(`//   ${m} mi → ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)} · ${Math.round(p.ele)}m`);
}
