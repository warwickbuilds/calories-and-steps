# Calories and Steps

An iOS and Android app for tracking calories, steps, weight and body fat. Everything is stored on the phone in SQLite. There is no account and no server.

Built with Expo (SDK 58), Expo Router, expo-sqlite and Drizzle ORM. The look follows the "Rings" design spec: Space Grotesk for numbers and headings, Inter for body text, green for steps and orange for calories, with light and dark themes.

## Status

Phase 1 (foundation) of the MVP plan:

- Onboarding: units, sex, age, height, current and goal weight, activity level, goal mode and daily step target.
- Daily calorie target: Mifflin-St Jeor maintenance × activity, then a flat daily offset for the goal (hard cut −800, steady cut −500, maintain 0, bulk +500), never below 1,500 (men) or 1,200 (women). Protein 2 g/kg, fat 25% of calories, carbs the rest.
- Today screen: steps and calories rings, macros, meals (with quick add and "Same as yesterday" on long press), and today's weight.
- Settings for every profile field, units (metric by default, imperial optional) and appearance.
- The full local database schema for later phases (meals, food items, saved foods, weight, body checks, body photos, daily steps).

Coming next: weight charts and Navy body-fat check-ins (Phase 2), AI meal logging (Phase 3), barcodes and step sync (Phase 4), backup (Phase 5).

## Running it

The app uses native modules, so it runs in a development build rather than Expo Go.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # or ios
npx expo start --dev-client
```

Install the build from the link EAS gives you, then open it while `expo start` is running.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests for the calorie, unit, body-fat and Today maths |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after changing `src/db/schema.ts` |

## Layout

```
src/app/          Screens (Expo Router). (tabs)/ holds Today, Food, Weight and Progress.
src/components/   UI kit (ui/) and profile input fields (fields/)
src/db/           SQLite schema, client and queries
src/hooks/        Live data hooks
src/lib/          Pure maths and formatting, with tests in __tests__/
src/theme/        Design tokens (colors.ts, tokens.ts) and the theme provider
drizzle/          Generated migrations, bundled into the app
```

Wording rule: the app always says "calories", never "kcal".
