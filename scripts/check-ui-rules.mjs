#!/usr/bin/env node
// Touch-UI rules for src/components (docs/ui-ux): no text-xs, no controls under 44px, no raw
// palette colours. A ratchet: counts recorded in ui-rules-baseline.json may only go down, so
// existing pages are fixed over time while new code can't add violations.
//
//   node scripts/check-ui-rules.mjs            check against the baseline
//   node scripts/check-ui-rules.mjs --update   record the current counts (after fixing some)
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const scanDir = join(root, "src/components");
const baselinePath = join(root, "scripts/ui-rules-baseline.json");

const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const RULES = {
  "text-xs": /\btext-xs\b/g,
  // A height under 44px on a control; icons use size-*, which this leaves alone.
  "small-height": /\b(?:h|min-h)-(?:8|9|10)\b/g,
  "raw-colour": new RegExp(
    `\\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder|decoration|accent|caret|shadow)-(?:${PALETTE})-\\d{2,3}\\b`,
    "g",
  ),
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const current = {};
for (const file of walk(scanDir)) {
  const text = readFileSync(file, "utf8");
  const counts = {};
  for (const [rule, pattern] of Object.entries(RULES)) {
    const n = (text.match(pattern) ?? []).length;
    if (n > 0) counts[rule] = n;
  }
  if (Object.keys(counts).length > 0) current[relative(root, file)] = counts;
}

// Tailwind v4 silently drops a utility whose theme key doesn't exist, so a typo in a token name
// (or v3's `bg-[--var]` syntax) renders unstyled with no error. Unlike the ratchet, these fail outright.
const css = readFileSync(join(root, "src/globals.css"), "utf8");
const themeKeys = new Set([...css.matchAll(/--((?:color|spacing|text)-[a-z0-9-]+):/g)].map((m) => m[1]));
const TOKEN_USES = [
  {
    pattern:
      /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder|decoration|accent|caret)-((?:surface|fg|theme-border|success|warning|danger|info)(?:-[a-z]+)*)\b/g,
    key: (name) => [`color-${name}`],
  },
  { pattern: /\b(?:h|w|min-h|min-w|max-h|max-w|size)-(tap(?:-[a-z]+)*)\b/g, key: (name) => [`spacing-${name}`] },
  { pattern: /\btext-(amount|total)\b/g, key: (name) => [`text-${name}`] },
];
const tokenFailures = [];
for (const file of walk(join(root, "src"))) {
  const text = readFileSync(file, "utf8");
  for (const { pattern, key } of TOKEN_USES) {
    for (const match of text.matchAll(pattern)) {
      if (!key(match[1]).some((k) => themeKeys.has(k))) tokenFailures.push(`${relative(root, file)}: ${match[0]}`);
    }
  }
  for (const match of text.matchAll(/\b[a-z-]+-\[--[a-z0-9-]+\]/g)) {
    tokenFailures.push(`${relative(root, file)}: ${match[0]} (Tailwind v3 syntax; use the token class)`);
  }
}
if (tokenFailures.length > 0) {
  console.error("Classes with no theme token in src/globals.css (Tailwind drops them silently):");
  for (const failure of [...new Set(tokenFailures)]) console.error(`  ${failure}`);
  process.exit(1);
}

if (process.argv.includes("--update")) {
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`ui-rules baseline written: ${Object.keys(sorted).length} files.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const failures = [];
let lowered = 0;
for (const [file, counts] of Object.entries(current)) {
  for (const [rule, n] of Object.entries(counts)) {
    const allowed = baseline[file]?.[rule] ?? 0;
    if (n > allowed) failures.push(`${file}: ${rule} ${n} (allowed ${allowed})`);
  }
}
for (const [file, counts] of Object.entries(baseline)) {
  for (const [rule, n] of Object.entries(counts)) if ((current[file]?.[rule] ?? 0) < n) lowered++;
}

const totals = Object.fromEntries(Object.keys(RULES).map((rule) => [rule, 0]));
for (const counts of Object.values(current)) for (const [rule, n] of Object.entries(counts)) totals[rule] += n;
console.log(`ui-rules: ${Object.entries(totals).map(([rule, n]) => `${rule} ${n}`).join(", ")}`);

if (failures.length > 0) {
  console.error("New touch-UI violations (docs/ui-ux):");
  for (const failure of failures) console.error(`  ${failure}`);
  console.error("Use the design tokens (text-base, h-tap*, intent colours) instead.");
  process.exit(1);
}
if (lowered > 0) {
  console.log(`${lowered} count(s) went down. Run \`yarn check:ui --update\` to lock the improvement in.`);
}
