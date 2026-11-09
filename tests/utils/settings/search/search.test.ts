import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SETTINGS_INDEX, SETTINGS_SECTION_TITLES, searchSettings } from "@/utils/settings/search";
import en from "@/i18n/locales/en.json";
import ka from "@/i18n/locales/ka.json";
import pl from "@/i18n/locales/pl.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";
import de from "@/i18n/locales/de.json";
import sv from "@/i18n/locales/sv.json";

const LOCALES: Record<string, unknown> = { en, ka, pl, es, fr, de, sv };

const lookup = (locale: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);
const translator = (locale: unknown) => (key: string) => String(lookup(locale, key) ?? key);

const SETTINGS_DIR = join(process.cwd(), "src/components/settings");
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });

describe("searchSettings", () => {
  const t = translator(en);

  it("returns nothing for an empty query", () => {
    expect(searchSettings("  ", t)).toEqual([]);
  });

  it("finds a section by its title", () => {
    const [hit] = searchSettings("scanner", t);
    expect(hit).toMatchObject({ section: "scanner", title: "Scanner" });
    expect(hit.setting).toBeUndefined();
  });

  it("finds a field by a sub-field's name and opens its section", () => {
    expect(searchSettings("iban", t)).toEqual([
      { section: "store", setting: "bank-details", title: "Bank details", sectionTitle: "Store" },
    ]);
  });

  it("needs every word, in any order", () => {
    const hits = searchSettings("format time", t).map((hit) => hit.setting);
    expect(hits).toContain("time-format");
    expect(hits).not.toContain("date-format");
  });

  it("ignores accents and works in Georgian", () => {
    expect(searchSettings("preferences", translator(fr))[0]).toMatchObject({ section: "preferences" });
    const georgian = String(lookup(ka, "settings.preferences.language"));
    expect(searchSettings(georgian, translator(ka)).map((hit) => hit.setting)).toContain("language");
  });
});

describe("settings search index", () => {
  it("has unique ids", () => {
    const ids = SETTINGS_INDEX.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every entry at a data-setting on its section's page", () => {
    for (const { id, section } of SETTINGS_INDEX) {
      const page = readFileSync(join(SETTINGS_DIR, section, "index.tsx"), "utf8");
      expect(page, `${section}: data-setting="${id}"`).toContain(`data-setting="${id}"`);
    }
  });

  it("indexes every data-setting on the settings pages", () => {
    const indexed = new Set(SETTINGS_INDEX.map((entry) => entry.id));
    for (const file of sourceFiles(SETTINGS_DIR)) {
      for (const [, id] of readFileSync(file, "utf8").matchAll(/data-setting="([^"]+)"/g)) {
        expect(indexed.has(id), `${file}: ${id} is not in SETTINGS_INDEX`).toBe(true);
      }
    }
  });

  it("has every label and section title in all 7 locales", () => {
    const keys = [...SETTINGS_INDEX.flatMap((entry) => entry.labelKeys), ...Object.values(SETTINGS_SECTION_TITLES)];
    for (const [name, locale] of Object.entries(LOCALES)) {
      for (const key of keys) expect(typeof lookup(locale, key), `${name}: ${key}`).toBe("string");
    }
  });
});
