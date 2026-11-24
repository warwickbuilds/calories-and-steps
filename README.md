# Calories and Steps

A simple, private Android app for tracking what you eat, how much you move and how your body changes. No account, no ads, no cloud: everything stays on your phone.

<p align="center">
  <img src="docs/screenshots/today.png" width="200" alt="Today screen with the steps and calories rings, macros and meals" />
  <img src="docs/screenshots/weight.png" width="200" alt="Weight screen with a one-month chart, trend line and change over time" />
  <img src="docs/screenshots/progress.png" width="200" alt="Progress screen with Navy-method body fat, check-ins and a body-fat chart" />
  <img src="docs/screenshots/today-dark.png" width="200" alt="Today screen in dark mode" />
</p>

**[Download the latest APK](https://github.com/warwickbuilds/calories-and-steps/releases/latest)** · Android only · Free and open source

## What it does

- **Calories and macros.** A daily calorie target worked out from your body and activity, with a goal of hard cut, steady cut, maintain or bulk. Protein, carbs and fat are shown against their own targets.
- **Photograph a meal.** Take a photo (or pick one), say what's in it out loud or type it, and AI estimates each part of the meal with grams, calories and macros. Check and fix the list, then add it. Works from a description alone too ("two eggs on toast"). Uses your own Google AI key; speech is turned into text on your phone.
- **Meals.** Log breakfast, lunch, dinner and snacks. Search the foods you've had before and add one in a tap, change the servings or grams, quick add calories in seconds, or copy a meal from yesterday. Tap anything you logged to fix it or move it to another meal.
- **Barcodes and labels.** Scan a barcode to look the product up in Open Food Facts, pick a serving or type the grams, and add it. If the product isn't there, photograph the nutrition label and AI reads it (using your own Google AI key). Every number can be fixed before adding, and scanned products are remembered on your phone.
- **Food history.** Step back through earlier days, add or fix food on any of them, and see your 7-day calorie average.
- **Weight.** A quick weigh-in on the home screen, charts from a week to all time, a smoothed trend line that ignores water swings, change over each period, and a projection of when you'll reach your goal.
- **Bring your weight history with you.** Screenshot the weight list in your old app (Lose It!, MyFitnessPal, a smart-scale app or anything that shows dates and weights), pick the screenshots, and AI reads every entry. You check and fix the list before anything is saved, and duplicates are skipped. Offered when you first set up the app, and any time from the Weight tab. Uses your own Google AI (Gemini) key.
- **Body fat.** Body fat (Navy method) check-ins from a tape measure, with lean and fat mass, plain BMI alongside, and front, side and back photos you can line up and compare side by side.
- **Steps.** A daily step target from 5,000 to 25,000 (step sync from Health Connect is coming).
- **Light and dark.** Follows your phone, or pick one.
- **Updates.** The app tells you when a new version is out.

**Coming next:** step sync from Health Connect, and backup and restore.

## Install

1. On the phone, open the [latest release](https://github.com/warwickbuilds/calories-and-steps/releases/latest) and download `calories-and-steps-<version>.apk` (about 143 MB, so use Wi-Fi).
2. Open the downloaded file. Android asks whether your browser (or Files app) may install unknown apps. Tap **Settings**, turn on **Allow from this source**, then go back and tap **Install**. You only need to do this once for that browser or app.
3. **Play Protect** may say the app is unrecognised or "unsafe" because it isn't from the Play Store. Tap **More details → Install anyway**. If it offers to scan the app, that's fine too.
4. Open the app and set up your profile.

**Updating**: when Today shows "Version x is available", tap **Download** and open the file. It installs over the old version and keeps your data. Every release is signed with the same key, so this always works. If Android ever says the app "conflicts with an existing package", the APK was signed with a different key; don't uninstall to get around it, because that deletes your data.

## Getting started

1. Pick metric or imperial.
2. Enter your sex, age and height, then your current weight and an optional goal weight.
3. Choose how active you are and your goal (hard cut, steady cut, maintain or bulk). You'll see your daily calorie target and macros straight away.
4. Set a daily step target.
5. Optionally paste a Google AI (Gemini) key and tap **Save and test**. It's needed for AI features such as importing weight history. [Get a key here](https://aistudio.google.com/apikey).
6. Optionally import your weight history from another app's screenshots, or skip and do it later from the Weight tab.

<p align="center"><img src="docs/screenshots/onboarding-goal.png" width="200" alt="Choosing a goal during setup, with the daily calorie target shown" /></p>

You can change any of this later in Settings (the gear on the Today screen).

## Your data and privacy

- Everything is stored on your phone. There is no account and nothing is uploaded to us.
- **Uninstalling the app, or clearing its storage in Android settings, deletes all your data and photos.** Installing a new version over the top keeps it. Backup and restore are on the way.
- The app sends only a few things: a daily check with GitHub for a newer version; the barcode number when you scan one, to Open Food Facts; and, when you import weights from screenshots, read a nutrition label or estimate a meal, those images and your meal description to Google AI (Gemini) using your own key. The app doesn't keep the screenshots, label photos or meal photos. What you say is turned into text on the phone; audio is never sent or kept. Your key is stored encrypted on the phone and only sent to Google.
- With a free Google Gemini key, Google may use those requests (including meal photos) to improve its models, so a paid key is recommended.

---

# For developers

Everything below is about how the app is built, released and maintained.

- MVP plan: https://claude.ai/artifact/KJqryMXn1xGxdkzNyhkXJX
- Design spec ("Rings"): https://claude.ai/artifact/K2jUTsD1PoJ4e57GyVbH9M

Wording rule: the app always says "calories", never "kcal".

## Contents

- [Status](#status)
- [Features](#features)
- [Versions and changelog](#versions-and-changelog)
- [Architecture](#architecture)
- [Services](#services)
- [Releases](#releases)
- [Running it](#running-it)
- [Maintenance](#maintenance)
- [Future enhancements](#future-enhancements)

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1. Foundation | Onboarding, profile, targets, Today screen, settings, database | Done (PR #1, #2) |
| 2. Weight and body fat | Weight charts, change cards, goal projection, Navy check-ins with photos | Done (PR #3) |
| Weight import | Import weight history from another app's screenshots with AI, offered in onboarding and on the Weight tab; provider adapter and Google AI key setup in onboarding and Settings (shared with Phase 3) | Done (PR #7) |
| 3a. Food log | Add-food screen with search over recent foods, servings and grams, editing logged items, Food tab by day with a 7-day average | Done (PR #8) |
| 3b. Barcodes and labels | Open Food Facts scanner with a local cache, AI nutrition-label reading when a product isn't found | Done (PR #8) |
| 3c. AI meal logging | Photo and spoken description meal estimate, review screen, privacy note | Done (PR #8) |
| 4. Steps | Step sync from Health Connect, favourites | Next |
| 5. Backup and polish | Zip export and import with a backup reminder, empty and offline states, icons | Planned |
| Releases | Signed APKs on GitHub Releases, in-app update check, public README | Done (PR #5) |

**v0.2.0** was released on 2026-11-24, the first signed APK, built by GitHub Actions and published from GitHub's Releases page (see [Releases](#releases)). **v0.3.0** (weight import and the Google AI key, PR #7) followed the same day and Rick confirmed it works on his phone. **v0.6.0** (all of Phase 3, PR #8) is released the same way once merged.

Phase 3 was built in three steps (the food log, barcodes and labels, then photo meal estimates), one commit each, and shipped together in PR #8 as 0.6.0. Versions 0.4.0 and 0.5.0 were never released. 0.6.0 adds a native module (speech recognition), so a new development build is needed for local work.

Checked on a real phone: everything up to v0.3.0, including the weight import's AI call with Rick's Gemini key. Not yet checked: anything from Phase 3 on.

## Features

The detailed list of what works now.

### Profile and targets

- Onboarding asks for units, sex, age, height, current and goal weight, activity level, goal mode and daily step target. Two optional steps follow: a Google AI key (with Save and test), then "Your weight history", which offers the screenshot import. Choosing **Import my weight history** saves the profile and opens the import screen straight after (handed over through `src/lib/onboardingIntent.ts`, because saving the profile swaps onboarding for the tabs). **Skip for now** goes to Today.
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
- Breakfast, Lunch, Dinner and Snacks, each with a "+" button (opens [Add food](#add-food)) and two pills:
  - "Quick add" enters calories and optional grams and macros.
  - "Same as yesterday" copies yesterday's items for that meal. It is hidden when that meal was empty yesterday.
- Tapping a meal's name opens the Food tab on that day.
- "Weight today" card for a quick weigh-in.

### Add food

- Opened by every "+" (Today and the Food tab), for the chosen meal and day. The meal can be switched at the top.
- **Recent foods**: everything logged before, one row per name (ignoring case), using the most recent serving's numbers, newest first, up to 50. Generic "Quick add" rows are left out. Built from the last 400 logged items, so there is no separate food list to keep in sync.
- **Search** matches every typed word anywhere in the name. With no match, it offers to quick add the typed name.
- The "+" on a row adds that serving straight away and shows a tick, so several foods can be added in a row; **Done** closes the screen. Tapping the row opens it first.
- **Quick add calories** opens the quick-add form for the same meal and day.

### Photo meal estimates

- **Add food → Photo of meal** opens the camera (`src/app/scan.tsx`, meal mode) with a gallery button for a photo taken earlier. **Describe it** skips the photo.
- **Estimate screen** (`src/app/estimate.tsx`): the photo, then "Anything the photo doesn't show?" with **Describe it out loud** and a text box. Spoken words are added to the text box, which can be edited.
- **Estimate calories** sends one request: the photo (shrunk to 1080 px JPEG) and the description, with a fixed schema (`src/lib/ai/mealEstimate.ts`). The prompt asks for one item per component, with grams, calories, protein, carbs, fat and a confidence, says the description wins over the photo (amounts, oil, brands, "only ate half"), and asks for hidden fats as their own items. Items with no name, negative numbers or over 5,000 calories or grams are dropped.
- **Check the estimate**: the total in calories and macros, then each item with its name, grams, calories and macros, all editable. Changing an item's grams rescales its numbers from the AI's figures. Items can be removed or added, and "Change description and re-estimate" goes back with the photo kept (it isn't re-encoded). Low-confidence items are marked.
- **Add N calories** saves one meal (`source` `photo`, or `manual` without a photo) with all its items. The meal keeps the description (`voice_text`), the provider and model (`ai_model`) and the raw answer (`ai_raw_json`) for the model benchmark later; items keep their `confidence`. The photo itself isn't kept.
- Without a Google AI key the button becomes "Add your Google AI key" (Settings). A short note under the form says what is sent and to whom.
- Model: the same default as the other AI features (`gemini-3.6-flash`) until the weighed benchmark picks per-feature defaults.

### Voice input

- `src/components/VoiceButton.tsx` uses `expo-speech-recognition`: tap to start, tap to stop, with interim text shown while talking. It asks for on-device recognition (`requiresOnDeviceRecognition`) whenever the phone supports it, in the phone's language, with punctuation. Only the text is used; the audio isn't recorded or kept.
- If on-device speech isn't set up for the language, or recognition isn't available, it says so and suggests the keyboard's microphone, which works in the same text box.
- The config plugin adds the `RECORD_AUDIO` permission and package visibility for Google's speech services (`com.google.android.googlequicksearchbox`, `com.google.android.tts`).

### Barcodes and labels

- **Add food → Scan barcode** opens a full-screen camera (`src/app/scan.tsx`) that reads EAN-13, EAN-8, UPC-A and UPC-E codes with expo-camera's built-in scanner and hands the first valid code to the product screen.
- **Product screen** (`src/app/product.tsx`): looks in the phone's cache (`food_ref` by barcode) first, then Open Food Facts. A product found online is cached straight away, so each barcode is fetched once.
  - "How much": 1 serving and 2 servings (when the product gives a serving size), 100 g, or any amount in grams. The calories and macros for that amount update as you type.
  - "Per 100 g": calories, serving size, protein, carbs and fat, all editable. Edits are saved over the cached product (marked `custom`) when you add, so the fix sticks next time.
  - The logged item is named "Brand Name" (without repeating the brand), with its grams, and linked to the cached product (`food_item.food_ref_id`). It then shows up in recent foods like anything else.
- **Not found**: offers "Photograph the label" (AI) or "Enter it myself". Either way the result is saved under that barcode. **Offline**: "Try again" or enter it.
- **Read a label** (from Add food, from a not-found barcode, or "Read the label with AI instead" on a product): the camera takes a photo, which is shrunk to 1080 px and sent to the AI provider with a fixed schema (`src/lib/ai/nutritionLabel.ts`). The model returns the per-100 g column if there is one (else per serving plus the serving size), and kJ is converted to calories (÷ 4.184). Answers above 950 calories per 100 g, or a per-serving column without a serving size, are rejected as misreads. The photo isn't kept.
- Label reading uses the same Google AI key and model as the weight import (`gemini-3.6-flash`). Without a key, the screen points to Settings → AI or lets you type the numbers.
- **Settings → About** credits Open Food Facts (Open Database License) with a link to its website.

### Food form (quick add, add and edit)

- One form (`src/components/FoodEditor.tsx`) for quick add, adding a recent food and editing a logged one: meal, name, calories, amount in grams (optional), protein, carbs and fat.
- When it starts from a known serving, **Servings** buttons (½, 1, 1½, 2) rescale every number, and changing the grams rescales calories and macros in proportion. Typing a number directly always wins.
- Editing a logged item has **Save** and **Delete**. Changing its meal moves it (a new meal entry on the same day; the old one is removed if left empty).
- Food added to another day is timed at midday that day; food added today uses the current time.

### Food tab

- One day at a time: arrows step back and forward (not past today). Tapping a meal's name on Today opens the tab on that day. The day is kept in the route (`/food?day=YYYY-MM-DD`).
- A summary card: calories eaten against the target, protein, carbs and fat, and the **7-day average**. The average covers the seven days ending on the shown day and counts only days with food logged, so a forgotten day doesn't drag it down.
- Each meal lists its items with calories, grams and macros. Tap one to edit or delete it. "+" adds to that meal on that day, and an empty meal offers "Same as yesterday" (or the previous date) when it had food the day before.

### Weight tab

- Chart with 1W, 1M, 6M, 1Y and All, plus a smoothed trend line (exponential smoothing, 10% per day) so water swings don't dominate.
- Change over the last week, month, 6 months, year and all time.
- Goal projection from the last four weeks of the trend, plus the weekly rate needed for an optional target date.
- Plain BMI and a weight history list.
- "Import from screenshots" button under History (also in Settings → Your data). See [Weight import](#weight-import).

### Weight import

- Pick up to 30 screenshots at a time from the phone's photo picker. Each is shrunk to 1080 px wide and sent, one at a time, to the chosen AI provider, which returns every date and weight it can see as JSON (a fixed schema: year or null, month, day, weight, kg or lb, and whether it came from a list row or a chart).
- Works with any app's list of dated weights, not only Lose It!. Stones and pounds are converted to pounds by the model, then everything is stored in kg.
- Rows without a year get the most recent year that isn't in the future, and are marked "Year not shown, so it was guessed".
- Rows that aren't real dates, are in the future, or are outside 20–400 kg are dropped and counted.
- Overlapping screenshots are merged by date. List rows win over chart estimates; if two readings of the same date disagree, the most common one wins and the other is shown ("Also read as …").
- A screenshot with only a chart gives up to 12 estimated key points, marked "Estimated from the chart". They are ticked only when no list rows were found.
- Review screen: every date with a tick box and an editable weight in your units. Dates already in the app with the same weight (within 0.05 kg) are left alone. Dates with a different weight are unticked and show the app's value; ticking one replaces it.
- "Add more screenshots" keeps what was already read and any ticks or edits. Saving is one transaction. Imported rows are stored at midday local time with source `import`.
- A bad key or a rate limit stops the run early with a plain message; other failures are listed per screenshot.

### AI provider and key

- Kept simple for now (Rick, 2026-11-24): one Google AI (Gemini) key, entered in onboarding (optional) or Settings → AI, and on the import screen if none is saved. **Save and test** stores the key and sends a tiny test request. "Get a key" opens Google AI Studio, and "Remove key" deletes it. The free-tier privacy note is shown under the key field.
- The adapter underneath already supports OpenAI and Claude and a model override (`saveAiSettings` takes a provider and model). The screens just don't offer them yet.
- Keys are kept in expo-secure-store (Android Keystore), not in the database.

### Progress tab

- "Body fat (Navy method)" check-ins: neck and waist, plus hips for women, giving body-fat %, lean mass and fat mass. Plain BMI is shown alongside.
- Front, side and back photos for each check-in, taken with a framing guide and a faint ghost of the last photo so shots line up.
- Scrollable photo timeline, side-by-side compare of any two dates, and a body-fat chart.

### Settings

- Every profile field, units, goal mode, target date and step target.
- Appearance: System, Light or Dark.
- AI: the Google AI key, with Save and test, Get a key and Remove key (see [AI provider and key](#ai-provider-and-key)).
- Your data: a warning that everything lives only on this phone, so uninstalling or clearing storage deletes it, while installing a new version over the top keeps it. Also an "Import weights from screenshots" button.
- About: app version with a "Check for updates" button, and the Open Food Facts credit with a link to its website.

### Updates

- On Android the app asks GitHub for the latest release at most once a day. When a newer version exists, Today shows a "Version x is available" card with a Download button that opens the APK link. "Not now" hides it until the next version.
- The check sends one anonymous request to `api.github.com` and nothing else. If GitHub can't be reached, or the repo is private, it stays quiet.

## Versions and changelog

App version: **0.6.0** (in `app.json` and `package.json`). Android's `versionCode` is worked out from it in `app.config.js` (major × 10,000 + minor × 100 + patch, so 0.2.0 is 200). Releases are tagged `v<version>`.

| Date | Change | PR |
| --- | --- | --- |
| 2026-11-24 | Phase 3c, photo meal estimates: photo (camera or gallery) plus spoken or typed description, AI estimate per item with grams, calories, macros and confidence, editable review with grams rescaling, describe-only estimates, on-device speech-to-text (expo-speech-recognition, microphone permission). Version 0.6.0 | #8 |
| 2026-11-24 | Phase 3b, barcodes and labels: barcode scanner, Open Food Facts lookup cached on the phone, servings or grams, editable per-100 g numbers, AI nutrition-label reading for unknown products or straight from Add food, Open Food Facts credit in Settings → About, camera permission text mentions barcodes | #8 |
| 2026-11-24 | Phase 3a, food log: add-food screen with search over recent foods and one-tap add, servings and grams rescaling, edit or delete or move any logged item, Food tab by day with a 7-day average, adding food to past days | #8 |
| 2026-11-24 | Import weight history from screenshots of another app, read by AI, offered in onboarding and on the Weight tab. Google AI key in onboarding and Settings. Provider-agnostic AI adapter (Gemini, OpenAI, Claude). Version 0.3.0 | #7 |
| 2026-11-24 | **v0.2.0 released**: first signed APK (143 MB), published from the Releases page | – |
| 2026-11-24 | Release workflow also attaches the APK to a release made on GitHub's Releases page | #6 |
| 2026-11-23 | Android-only sideloading: signed APK release workflow, release-key signing plugin, versionCode from the version, in-app update check, uninstall warning, install guide. README split into a public part (features, screenshots, install) and a developer part. Version 0.2.0 | #5 |
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
| expo-camera (photos and barcode scanning) / expo-image-manipulator / expo-file-system | ~58.0.14 / ~58.0.16 / ~58.0.14 |
| expo-constants (update check) | ~58.0.16 |
| expo-image-picker (weight import) | ~58.0.10 |
| expo-secure-store (AI keys) | ~58.0.3 |
| expo-speech-recognition (voice descriptions; community module by jamsch) | ~58.0.1 |
| Release build tools (CI) | Node 22, JDK 17 (Temurin), Gradle from the Expo template |
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
  - Stack screens: settings, add-food (modal), quick-add (modal), food-item (modal: add a recent food or edit a logged one), scan (full screen: barcode, label photo or meal photo), product (modal), estimate (modal: meal photo and description to AI estimate), check-in (modal), camera (full screen), check-ins/[id], compare, import-weights.
  - `Stack.Protected` shows onboarding until a profile exists.
- **Data**: one SQLite file, 8 tables: profile, meal, food_item, food_ref, weight_entry, body_check, body_photo, steps_day. All values are metric; display converts.
  - Live queries need `enableChangeListener` (set in `src/db/client.ts`), and foreign keys are switched on.
  - Migrations in `drizzle/` are bundled into the app (babel inline-import plus a metro `sql` extension) and run at start-up by `useMigrations` in `src/app/_layout.tsx`.
- **Photos**: taken with expo-camera, saved by expo-image-manipulator as a 1080 px JPEG plus a 240 px thumbnail under `document/photos`. The database stores relative paths only, so backups and restores stay portable. `src/lib/captureStore.ts` hands camera results back to the check-in screen.
- **AI** (`src/lib/ai/`): one adapter for every AI feature. A feature describes its request once (prompt, images, JSON Schema) as an `AiJsonRequest`; `providers.ts` turns it into a Gemini `generateContent`, OpenAI Responses or Claude Messages call with structured JSON output and low reasoning effort, and parses the answer. Calls use `fetch` straight from the phone, no SDKs. `settings.ts` stores the provider, keys and model overrides in secure store. `weightScreenshot.ts` holds the screenshot prompt and schema, `nutritionLabel.ts` the label prompt, schema and answer checks, `mealEstimate.ts` the meal prompt, schema and answer checks; `prepareImage.ts` shrinks images to base64 JPEG. 
- **Weight import** (`src/app/import-weights.tsx`, `src/lib/weightImport.ts`): the pure functions check each row, merge screenshots and compare with existing weights; `importWeights` in `src/db/queries.ts` saves the ticked rows. `weight_entry.source` gained the value `import` (a TypeScript enum only, so no migration).
- **Charts**: a small custom SVG line chart (`src/components/LineChart.tsx`) instead of a chart library. Charts use neutral colours, because green and orange are reserved for steps and calories.
- **Release build** (`app.config.js`, `plugins/`): `app.config.js` adds the `versionCode` and the `withReleaseSigning` config plugin on top of `app.json`. The plugin edits the generated `android/app/build.gradle` so release builds sign with the key named by `ANDROID_KEYSTORE_PATH` and friends, falling back to the debug key when they are not set. `android/` itself is never committed; `expo prebuild` regenerates it.
- **Update check** (`src/lib/updates.ts`, `src/lib/version.ts`, `src/components/UpdateBanner.tsx`): compares the installed version (`expo-constants`) with the latest GitHub release of `extra.releasesRepo` in `app.json`, caching the result and any dismissed version in `update-check.json` in the document folder.
- **Design system**: tokens in `src/theme` (colours for light and dark, spacing, radius, type scale). Space Grotesk for numbers and headings, Inter for text, lucide icons. Font scaling is capped at 1.3×.
- **Food log** (`src/lib/food.ts`, `src/db/meals.ts`): recent foods are worked out from logged items (`recentItemsQuery`, then `recentFoods` de-duplicates by name), so no food table has to be kept in sync. Each add makes its own `meal` row with one `food_item`; `updateFoodItem` moves an item between meals; `dailyCaloriesQuery` sums calories per day for the 7-day average. Pure helpers for search, scaling, day labels and the average are tested on their own. No schema change, so no migration.
- **Barcodes** (`src/lib/openFoodFacts.ts`, `src/db/foods.ts`): `lookupBarcode` calls the Open Food Facts v2 product API asking only for the fields used, with a `User-Agent` naming the app as Open Food Facts asks. `parseOffProduct` turns the answer into per-100 g numbers (kJ converted when calories are missing). Products, label reads and corrections live in the existing `food_ref` table (`source` is `off`, `panel` or `custom`), saved by `saveFoodRef`, which updates in place when the barcode is already cached.
- **Maths** (`src/lib`): `energy.ts` (maintenance, targets, age), `food.ts` (recent foods, search, servings, weekly average), `body.ts` (Navy formula, BMI), `weight.ts` (trend, change rows, projection), `units.ts`, `dates.ts`, `today.ts`, `validation.ts`.

### Folder layout

```
src/app/          Screens (Expo Router). (tabs)/ holds Today, Food, Weight and Progress.
src/components/   UI kit (ui/), profile input fields (fields/), chart, photo thumb, shared cards
src/db/           SQLite schema, client, queries and write functions
src/hooks/        Live data hooks
src/lib/          Pure maths and formatting, with tests in __tests__/
src/lib/ai/       AI provider adapter, key settings and prompts
src/theme/        Design tokens (colors.ts, tokens.ts) and the theme provider
drizzle/          Generated migrations, bundled into the app
plugins/          Expo config plugins and helpers for the Android release build
docs/screenshots/ README screenshots
.github/workflows Android release workflow (android-release.yml)
```

## Services

| Service | Used for | State |
| --- | --- | --- |
| GitHub | Code and pull requests | In use |
| GitHub Actions | Builds, signs and publishes the release APK on every `v*` tag (`android-release.yml`). Holds the release key as secrets. Free for this use | In use |
| GitHub Releases | Hosts the APKs. The app reads `api.github.com/repos/<repo>/releases/latest` once a day to offer updates. Needs a public repo (see [Releases](#releases)) | In use |
| Expo EAS Build | Optional development builds for working on the app. Not used for releases, so the free tier's monthly build limit doesn't matter | Optional |
| Apple App Store and Google Play | Store release | On hold |
| Google Gemini (in use); OpenAI and Anthropic Claude (supported by the adapter, not offered in the app yet) | Reading weight screenshots and nutrition labels, and estimating meals from a photo and description, using the user's own API key stored in the Android Keystore (expo-secure-store). Default models: `gemini-3.6-flash`, `gpt-6-luna`, `claude-haiku-5-5`. Rick uses a paid Gemini key. On Google's free tier, Google may use requests (screenshots, photos and descriptions) to improve its models, so Settings says so and recommends a paid key | In use (weight import, labels, meals) |
| Open Food Facts | Barcode lookups (`world.openfoodfacts.org/api/v2/product/<barcode>.json`). Free, no key, Open Database License, credited in Settings → About. Each product is fetched once and cached on the phone | In use (from 0.6.0) |
| Apple Health (HealthKit) and Health Connect | Reading daily steps, and weight from smart scales. Google Fit is skipped because it is being retired | Phase 4 |

The only network calls today are the daily update check, Open Food Facts lookups for scanned barcodes, and the screenshots or label photos the user sends to their AI provider. Speech is recognised on the phone where it supports that; on phones without on-device recognition, Android's speech service may use Google's servers, which is outside the app. Voice notes will be transcribed on the phone and never uploaded.

## Releases

APKs are built and signed by GitHub Actions (`.github/workflows/android-release.yml`) with a local Gradle build (`expo prebuild` then `gradlew assembleRelease`), not EAS.

### One-time setup: the release key

Android only installs an update if it is signed with the same key as the installed app. **If the key is lost, no update can ever install over the existing app again**, and the only way forward is uninstalling, which wipes the data. So make it once, keep two backups, and never commit it.

1. Make the key on your computer. `keytool` comes with a JDK: Android Studio includes one, or install Temurin 17. Pick a strong password when it asks. `-dname` fills in the certificate's name, so keytool doesn't ask its "What is your first and last name?" questions. The real key uses the alias `calories`.

   - **Windows (PowerShell).** `keytool` usually isn't on the PATH, so call Android Studio's copy by its full path. Keep it on one line, because PowerShell doesn't use `\` to continue lines:

     ```powershell
     & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore calories-and-steps-release.jks -alias calories -keyalg RSA -keysize 4096 -validity 36500 -dname "CN=Calories and Steps"
     ```

   - **macOS / Linux:**

     ```bash
     keytool -genkeypair -v -storetype PKCS12 -keystore calories-and-steps-release.jks \
       -alias calories -keyalg RSA -keysize 4096 -validity 36500 \
       -dname "CN=Calories and Steps"
     ```

2. Back it up: save the `.jks` file and the password in your password manager, and a second copy somewhere offline (for example a USB stick). Don't put it in the repo folder.
3. Encode it for GitHub:
   - macOS / Linux: `base64 -i calories-and-steps-release.jks | tr -d '\n' > keystore.txt`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("calories-and-steps-release.jks")) | Set-Content keystore.txt`
4. Get the certificate fingerprint: `keytool -list -v -keystore calories-and-steps-release.jks -alias calories` and copy the `SHA256:` line. On Windows, use the same full `keytool.exe` path as in step 1.
5. In GitHub, open the repo's **Settings → Secrets and variables → Actions → New repository secret** and add:

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | Contents of `keystore.txt` |
   | `ANDROID_KEYSTORE_PASSWORD` | The password |
   | `ANDROID_KEY_ALIAS` | The alias from step 1 (`calories`) |
   | `ANDROID_KEY_PASSWORD` | The password (same as above) |
   | `ANDROID_CERT_SHA256` | The SHA256 fingerprint (optional, but the build then refuses to publish an APK signed with any other key) |

6. Delete `keystore.txt`.
7. The repo must be public (**Settings → General → Danger Zone → Change visibility**) so the APK links and the in-app update check work without signing in. Nothing private is in the code or its history.

### Making a release

1. In a PR, bump `version` in `app.json` and `package.json` (for example 0.2.0 → 0.3.0) and add a changelog row.
2. After it merges, either push a tag (`git tag v0.3.0 origin/main && git push origin v0.3.0`), or on GitHub open **Releases → Draft a new release**, type `v0.3.0` as a new tag on `main`, and publish. In the second case the release appears straight away and the APK is added to it when the build finishes.
3. The workflow checks the tag matches `app.json`, runs the tests, builds and signs the APK, checks the signature and publishes the release with the APK attached. It takes about 15 to 25 minutes.

The current release key's certificate SHA-256 is `07aea4df8cd30a8827dce11db1083b4ded20f0a36a98d58120da397011ae18c8` (alias `calories`). Every release must show this same fingerprint. The release page lists it, and `ANDROID_CERT_SHA256` makes the build refuse any other key.

### How v0.2.0 was released (2026-11-24)

1. PR #5 (the release pipeline) was merged and the repo was made public.
2. Pushing tags isn't possible from Claude's cloud sessions, so PR #6 made the workflow also run when a release is published on GitHub's **Releases** page, and attach the APK to it.
3. Rick created the key with the Windows command above, added the secrets, then used **Releases → Draft a new release** with the new tag `v0.2.0` on `main`.
4. GitHub Actions built and signed `calories-and-steps-0.2.0.apk` in about 20 minutes and attached it to the release.
5. The APK is **143 MB**, because it's a universal build with native code for every phone chip type (arm64, 32-bit arm, x86, x86_64).
6. Anyone who installed the earlier test APK from a PR build has to uninstall it first. Those builds use the debug key, so they can't be updated by a release.

Use the same Releases-page steps for v0.3.0 and later releases.

Pull requests that change the build set-up (`app.json`, `app.config.js`, `plugins/`, dependencies or the workflow) also build the APK, without releasing it, and keep it as a build artifact for 7 days. **Run workflow** on the Actions tab does the same for any branch.

## Running it

For day-to-day development the app runs in a development build rather than Expo Go, because it uses native modules.

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
| `npm test` | Unit tests for the calorie, unit, body-fat, weight-trend, Today and food-log maths, Open Food Facts, nutrition-label and meal-estimate parsing, the weight-import merging and the AI request builders |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `npx expo export -p android` | Bundles the app, a quick check that everything resolves. (The web bundle fails on expo-sqlite's wasm file; the app doesn't target web) |

## Maintenance

- **Before every PR**: run `npm test`, `npm run typecheck`, `npm run lint` and `npx expo export -p android`, and update this README (see `CLAUDE.md`).
- **Adding a package**: use `npx expo install <package>` so it matches the SDK. If that can't reach Expo's servers, read the right version from `node -e 'console.log(require("expo/bundledNativeModules.json")["<package>"])'` and `npm install` it.
- **Native modules**: after adding one, add its config plugin to `app.json` if it has one, then make a new EAS development build.
- **Database changes**: edit `src/db/schema.ts`, run `npm run db:generate`, and check the SQL it writes into `drizzle/`. drizzle-kit asks about renames interactively and fails when it can't, so do a rename as two migrations (add the new column, then drop the old one) and hand-add any data backfill. Never edit a migration that has shipped.
- **Upgrading the Expo SDK**: read the SDK release notes, run `npx expo install expo@^<new>` then `npx expo install --fix`, run all the checks, then make new development builds.
- **Releases**: see [Releases](#releases). Never reuse or lower a version: Android needs a higher `versionCode` every time. Minor and patch must stay below 100.
- **Screenshots** (`docs/screenshots`): taken from the web build at 390×844, 2× scale, with Playwright. `metro.config.js` adds `wasm` as an asset so expo-sqlite's web worker bundles. On web the database must be opened with `openDatabaseAsync` once before the app loads, so use a temporary entry file that does that, runs the migrations with drizzle's `migrate`, seeds sample data, then `require('expo-router/entry')`, and point `main` at it while capturing. Don't commit that entry. expo-sqlite on web needs `SharedArrayBuffer`, so the page must be cross-origin isolated: in Playwright, route the dev server's responses and add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Retake them when a screen changes noticeably.
- **Release key**: lives only in GitHub secrets and Rick's backups. If GitHub secrets are ever lost, re-add them from the backup. If the key itself is lost, a new key means every phone has to uninstall (and lose data) once, so take a backup export first.
- **Build tools**: the workflow uses Node 22 and JDK 17. When an Expo SDK upgrade needs newer ones, change them in `android-release.yml`.
- **Open Food Facts**: no key or account. If lookups start failing for every barcode, check the v2 API (`/api/v2/product/<barcode>.json`) is still current and that the `User-Agent` is being sent. Field names used: `product_name`, `generic_name`, `brands`, `serving_quantity`, `nutriments.energy-kcal_100g`, `energy-kj_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`.
- **AI models**: providers retire model names. When one stops working (Settings → Save and test says the model isn't recognised), update `defaultModel` in `src/lib/ai/providers.ts` and release a new version. Gemini's `generateContent` is now a legacy API (still supported); move to its Interactions API if Google announces a shutdown.
- **expo-speech-recognition** is a community module (github.com/jamsch/expo-speech-recognition), versioned to match the Expo SDK (58.x for SDK 58). On an SDK upgrade, install the matching major. It has a config plugin in `app.json`.
- **expo-image-picker** is used without its config plugin on purpose: the plugin's `cameraPermission: false` would block the camera permission the progress photos need, and leaving it out avoids extra permissions (the microphone permission now comes from expo-speech-recognition). Android's photo picker needs no permission. Add the plugin (with `photosPermission`) when iOS returns.
- **Design rules**: green is only for steps and orange only for calories. Say "calories", never "kcal".

## Future enhancements

Everything we've discussed that is not built yet.

**AI meal logging, later**
- Per-feature default models: a mid-tier model for meals and the cheapest for nutrition labels, once the benchmark picks them (everything uses `gemini-3.6-flash` for now).
- Keep a small meal photo with the logged meal and show it on the Food tab (the `meal.photo_path` column is already there).
- A full consent screen before the first photo goes out, if the app is ever shared beyond paid-key users (for now a short note under the form, as Rick uses a paid key).
- Hold-to-talk as well as tap-to-talk, and offering to download the on-device speech model when it's missing.
- Let the user choose OpenAI or Claude instead of Gemini, and change the model, in Settings. The adapter already supports both; only the screens are missing. Kept out for now to keep setup simple.
- A weighed 30-meal benchmark across providers to pick the default models.
- Swiping left and right between days on the Food tab (arrows for now), and a calendar to jump to a date.
- Saving a whole meal (several foods) as one reusable item, and logging a meal for several people with a share.

**Weight import, later**
- Import a CSV file for apps that do export, and weight history from Health Connect.
- Read very long scrolling screenshots in slices, and more than 30 screenshots in one go.
- Mark imported entries in the weight history list, with an "undo this import" option.

**Barcodes and labels, later**
- Use a cheaper "lite" model for labels once the model benchmark picks one (they use the default model for now).
- Contribute products that aren't in Open Food Facts back to it (needs an Open Food Facts account).
- Products sold by volume (ml) are treated as grams; show ml where the product says so.
- Refresh a cached product from Open Food Facts after a while, in case its data was corrected.

**Phase 4: steps**
- Favourites (pin a food to the top of the recent list).
- Step sync from Apple Health and Health Connect, with a history chart and the step target as a goal line.
- Optional weight sync from smart scales through the health app.

**Phase 5: backup and polish**
- Export a single zip (database, manifest and photos) through the share sheet, and import it back.
- A reminder to back up every couple of weeks, showing the date of the last backup, plus a nudge to export before installing an update by hand.
- Empty states, offline error handling, app icons.

**After the MVP**
- Optional Play Store (or internal testing track) release, and a return to iOS with App Store and TestFlight. The iOS settings in `app.json` and the EAS profiles are kept for this.
- Download and open the update APK from inside the app instead of through the browser.
- Smaller APKs: build one APK per phone chip type (ABI split), or arm64 only, which covers modern phones. That's about a third of today's 143 MB universal APK. The update check would then have to pick the right file.
- A small key-holding relay (with App Attest and Play Integrity) so people can use the AI without their own key.
- Signing in with OpenRouter instead of pasting a key.
- Automatic Google Drive backup.
- Home-screen widgets.
- Adding active calories burned to the daily calorie budget.
