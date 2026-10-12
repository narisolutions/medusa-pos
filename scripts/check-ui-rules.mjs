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
