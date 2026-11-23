# Calories and Steps

An iOS and Android app for tracking calories, steps, weight and body fat. Everything is stored on the phone in SQLite. There is no account and no server.

- MVP plan: https://claude.ai/artifact/KJqryMXn1xGxdkzNyhkXJX
- Design spec ("Rings"): https://claude.ai/artifact/K2jUTsD1PoJ4e57GyVbH9M

Wording rule: the app always says "calories", never "kcal".

## Contents

- [Status](#status)
- [Features](#features)
- [Versions and changelog](#versions-and-changelog)
- [Architecture](#architecture)
- [Services](#services)
- [Running it](#running-it)
- [Maintenance](#maintenance)
- [Future enhancements](#future-enhancements)

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1. Foundation | Onboarding, profile, targets, Today screen, settings, database | Done (PR #1, #2) |
| 2. Weight and body fat | Weight charts, change cards, goal projection, Navy check-ins with photos | Done (PR #3) |
| 3. AI meal logging | Photo and voice meal estimate, provider adapter, review screen, API key setup | Next |
| 4. Barcode, panels and steps | Open Food Facts scanner, nutrition-panel reading, favourites, step sync | Planned |
| 5. Backup and polish | Zip export and import, empty and offline states, icons, store testing | Planned |

The app has not yet been installed on a phone. That needs an EAS development build on Rick's Expo account (see [Running it](#running-it)).

## Features

### Profile and targets

- Onboarding asks for units, sex, age, height, current and goal weight, activity level, goal mode and daily step target.
- Age is stored as the age entered plus the date it was entered, and goes up by one on each anniversary. There is no date of birth.
- Daily calorie target: Mifflin-St Jeor maintenance × activity level, then a flat daily offset for the goal:
  - Hard cut: 800 calories below maintenance
  - Steady cut: 500 below
  - Maintain: 0
  - Bulk: 500 above
- The target never goes below 1,500 calories for men or 1,200 for women. It is recalculated as weight changes.
- Macros: protein 2 g per kg, fat 25% of calories, carbs the rest.
- Step target slider from 5,000 to 25,000 in steps of 500.
- Metric by default, with a switch to lb and inches. Everything is stored in metric.

### Today screen

- Steps and calories rings. Steps shows "Connect steps" until step sync arrives in Phase 4.
- Calories left, or "N over" in red once past the target.
- Protein, carbs and fat bars against their targets.
- Breakfast, Lunch, Dinner and Snacks, each with a "+" button and two pills:
  - "Quick add" enters calories and optional macros.
  - "Same as yesterday" copies yesterday's items for that meal. It is hidden when that meal was empty yesterday.
- "Weight today" card for a quick weigh-in.

### Food tab

- Lists what was logged today, by meal, with delete.

### Weight tab

- Chart with 1W, 1M, 6M, 1Y and All, plus a smoothed trend line (exponential smoothing, 10% per day) so water swings don't dominate.
- Change over the last week, month, 6 months, year and all time.
- Goal projection from the last four weeks of the trend, plus the weekly rate needed for an optional target date.
- Plain BMI and a weight history list.

### Progress tab

- "Body fat (Navy method)" check-ins: neck and waist, plus hips for women, giving body-fat %, lean mass and fat mass. Plain BMI is shown alongside.
- Front, side and back photos for each check-in, taken with a framing guide and a faint ghost of the last photo so shots line up.
- Scrollable photo timeline, side-by-side compare of any two dates, and a body-fat chart.

### Settings

- Every profile field, units, goal mode, target date and step target.
- Appearance: System, Light or Dark.

## Versions and changelog

App version: **0.1.0** (in `app.json` and `package.json`). Store build numbers are managed remotely by EAS (`appVersionSource: remote`, `autoIncrement` on production).

| Date | Change | PR |
| --- | --- | --- |
| 2026-11-23 | README brought fully up to date; rule added to keep it current with every PR | #4 |
| 2026-11-23 | Phase 2: weight charts, goal projection, Navy body-fat check-ins with photos | #3 |
| 2026-11-23 | Ask for age instead of date of birth (migrations 0001 and 0002) | #2 |
| 2026-11-23 | Phase 1: foundation, onboarding, settings, Today screen; meal pills; Appearance switch | #1 |

### Main dependency versions

| Package | Version |
| --- | --- |
| Expo SDK | 58 (`expo ~58.0.26`) |
| React Native | 0.88.1 |
| React | 19.3.0 |
| Expo Router | ~58.0.32 |
| expo-sqlite | ~58.0.18 |
| Drizzle ORM / drizzle-kit | ^0.45.4 / ^0.31.11 |
| Reanimated | 4.7.1 |
| react-native-svg | ^15.16.0 |
| expo-camera / expo-image-manipulator / expo-file-system | ~58.0.14 / ~58.0.16 / ~58.0.14 |
| TypeScript | ~6.0.3 |
| Jest (jest-expo preset) | ^30.5.2 |

## Architecture

```
Screens (src/app, Expo Router)
   │  read through live hooks (src/hooks/data.ts → Drizzle useLiveQuery)
   │  write through small functions (src/db/queries.ts, meals.ts, body.ts)
   ▼
SQLite on the phone (expo-sqlite + Drizzle, schema in src/db/schema.ts)
   +  photo files in the app's document folder (paths stored in the DB)

Pure maths and formatting (src/lib) is shared by screens and tested on its own.
```

- **App framework**: Expo with TypeScript, run as a development build (not Expo Go) because of native modules. Routes live in `src/app`.
  - Tabs: Today, Food, Weight, Progress.
  - Stack screens: settings, quick-add (modal), check-in (modal), camera (full screen), check-ins/[id], compare.
  - `Stack.Protected` shows onboarding until a profile exists.
- **Data**: one SQLite file, 8 tables: profile, meal, food_item, food_ref, weight_entry, body_check, body_photo, steps_day. All values are metric; display converts.
  - Live queries need `enableChangeListener` (set in `src/db/client.ts`), and foreign keys are switched on.
  - Migrations in `drizzle/` are bundled into the app (babel inline-import plus a metro `sql` extension) and run at start-up by `useMigrations` in `src/app/_layout.tsx`.
- **Photos**: taken with expo-camera, saved by expo-image-manipulator as a 1080 px JPEG plus a 240 px thumbnail under `document/photos`. The database stores relative paths only, so backups and restores stay portable. `src/lib/captureStore.ts` hands camera results back to the check-in screen.
- **Charts**: a small custom SVG line chart (`src/components/LineChart.tsx`) instead of a chart library. Charts use neutral colours, because green and orange are reserved for steps and calories.
- **Design system**: tokens in `src/theme` (colours for light and dark, spacing, radius, type scale). Space Grotesk for numbers and headings, Inter for text, lucide icons. Font scaling is capped at 1.3×.
- **Maths** (`src/lib`): `energy.ts` (maintenance, targets, age), `body.ts` (Navy formula, BMI), `weight.ts` (trend, change rows, projection), `units.ts`, `dates.ts`, `today.ts`, `validation.ts`.

### Folder layout

```
src/app/          Screens (Expo Router). (tabs)/ holds Today, Food, Weight and Progress.
src/components/   UI kit (ui/), profile input fields (fields/), chart, photo thumb, shared cards
src/db/           SQLite schema, client, queries and write functions
src/hooks/        Live data hooks
src/lib/          Pure maths and formatting, with tests in __tests__/
src/theme/        Design tokens (colors.ts, tokens.ts) and the theme provider
drizzle/          Generated migrations, bundled into the app
```

## Services

| Service | Used for | State |
| --- | --- | --- |
| Expo EAS Build | Cloud builds for iOS and Android (no Mac needed). Profiles: development, development-simulator, preview, production | In use |
| GitHub | Code and pull requests | In use |
| Apple App Store and Google Play | Public release, via EAS Submit | Phase 5 |
| Google Gemini, OpenAI, Anthropic Claude | AI meal and nutrition-panel estimates, using the user's own API key stored in the Keychain or Keystore (expo-secure-store). Gemini is the default because its key is free | Phase 3 |
| Open Food Facts | Barcode lookups. Free, no key, results cached locally | Phase 4 |
| Apple Health (HealthKit) and Health Connect | Reading daily steps, and weight from smart scales. Google Fit is skipped because it is being retired | Phase 4 |

The app makes no network calls today. Once AI and barcodes arrive, the only calls will be the AI estimate, the Open Food Facts lookup and an optional backup the user chooses to save. Voice notes will be transcribed on the phone and never uploaded.

## Running it

The app uses native modules, so it runs in a development build rather than Expo Go.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # or ios
npx expo start --dev-client
```

Install the build from the link EAS gives you, then open it while `expo start` is running. A new development build is needed whenever a native module is added (Phase 2 added the camera).

### Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the calorie, unit, body-fat, weight-trend and Today maths |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npx expo export` | Bundles the app, a quick check that everything resolves |

## Maintenance

- **Before every PR**: run `npm test`, `npm run typecheck`, `npm run lint` and `npx expo export`, and update this README (see `CLAUDE.md`).
- **Adding a package**: use `npx expo install <package>` so it matches the SDK. If that can't reach Expo's servers, read the right version from `node -e 'console.log(require("expo/bundledNativeModules.json")["<package>"])'` and `npm install` it.
- **Native modules**: after adding one, add its config plugin to `app.json` if it has one, then make a new EAS development build.
- **Database changes**: edit `src/db/schema.ts`, run `npm run db:generate`, and check the SQL it writes into `drizzle/`. drizzle-kit asks about renames interactively and fails when it can't, so do a rename as two migrations (add the new column, then drop the old one) and hand-add any data backfill. Never edit a migration that has shipped.
- **Upgrading the Expo SDK**: read the SDK release notes, run `npx expo install expo@^<new>` then `npx expo install --fix`, run all the checks, then make new development builds.
- **Releases**: bump `version` in `app.json` and `package.json`, add a changelog row above, and build with the production profile. EAS raises the build numbers.
- **Design rules**: green is only for steps and orange only for calories. Say "calories", never "kcal".

## Future enhancements

Everything we've discussed that is not built yet.

**Phase 3: AI meal logging**
- Photo plus hold-to-talk voice note, transcribed on the phone, sent in one request to the user's chosen AI provider.
- Provider adapter with one JSON schema for all providers: Gemini (default), OpenAI and Claude. Mid-tier models for meals, the cheapest model for nutrition panels, low reasoning effort.
- Review and edit screen (edit grams, delete, add items) before saving.
- Guided "get your key" step with a test button, a one-time consent screen naming the provider and what is sent, and a privacy note for Gemini's free tier.
- A weighed 30-meal benchmark across providers to pick the default models.
- Food log tab with day-by-day history, swiping between days and a weekly calorie average.

**Phase 4: barcode, panels and steps**
- Open Food Facts barcode scanner with a servings picker. Unknown products fall back to photographing the nutrition panel.
- Favourites and recent foods.
- Step sync from Apple Health and Health Connect, with a history chart and the step target as a goal line.
- Optional weight sync from smart scales through the health app.

**Phase 5: backup and polish**
- Export a single zip (database, manifest and photos) through the share sheet, and import it back.
- Empty states, offline error handling, app icons, TestFlight and Play internal testing.

**After the MVP**
- A small key-holding relay (with App Attest and Play Integrity) so people can use the AI without their own key.
- Signing in with OpenRouter instead of pasting a key.
- Automatic Google Drive backup.
- Home-screen widgets.
- Adding active calories burned to the daily calorie budget.
