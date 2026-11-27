# AI accuracy benchmark

Measures how close each Gemini model gets to the truth on real, weighed meals and real nutrition labels, using the app's own prompts, schemas and parsers (`src/lib/ai/mealEstimate.ts`, `src/lib/ai/nutritionLabel.ts`, `src/lib/ai/providers.ts`). The result picks the default model for meal estimates and for label reading. This folder is a developer tool: it isn't bundled into the app.

## What it tests

- **30 weighed meals**, each sent three ways: **photo + description** (how most meals get logged), **photo only**, and **description only**.
- **15 nutrition-label photos**, scored on calories per 100 g (or 100 ml).
- **Each model twice** by default (`--runs 2`), because the same photo can get a different answer, and that wobble matters too.
- Default models: `gemini-3.6-flash` (today's default), `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` and `gemini-4-hydrogen`. Models the key can't use are skipped with a note. Change the list with `--models a,b,c`.

All calls use the app's settings: images shrunk to 1080 px wide, JPEG at 85%, thinking level low.

## Collecting the meals

You need a kitchen scale, your phone and about 5 extra minutes per meal. Spread the 30 meals over a couple of weeks of normal eating.

**A good mix (aim for roughly this):**

| How many | Kind | Examples |
| --: | --- | --- |
| 10 | Home-cooked plates with separate parts | chicken, rice and veg; steak and chips; salmon and potatoes |
| 6 | Mixed dishes where parts are hidden | stir-fry, spag bol, curry, pasta bake, soup |
| 5 | Breakfasts | cereal and milk, eggs on toast, oats with fruit, yoghurt bowl |
| 5 | Sandwiches, wraps, burgers, salads with dressing | |
| 4 | Snacks and drinks | latte, protein shake, a piece of fruit with peanut butter, chocolate |

Include some meals with oil, butter, cheese or creamy sauce: hidden fat is where photo estimates usually go wrong.

**For each meal:**

1. **Weigh as you serve.** Put the plate on the scale, press tare, add one component, write down the grams, tare again, add the next. Weigh food as eaten (cooked rice, cooked chicken). For oil or butter used in cooking, weigh the bottle or block before and after, or count spoons (1 tablespoon of oil ≈ 14 g). If you cook a big batch, weigh the whole pot and your portion and take that share of each ingredient.
2. **Take one photo** before you eat, the way you'd take it in the app: whole plate in frame, normal angle, normal light, cutlery in shot if it's there. No scale in the photo, and nothing written on the plate.
3. **Say or type a description** the way you would in the app, from memory and without the weights: "chicken breast, about a cup of rice, some broccoli, cooked in a bit of olive oil". Amounts you'd naturally know ("two eggs", "one slice of toast", "a tablespoon of peanut butter") are fine. Grams from the scale are not.
4. **Eat it all**, or weigh what's left and subtract it.

**Calories per 100 g for each component**, best first: the packet's nutrition panel; the app's barcode scan (Open Food Facts); otherwise a food database entry for the cooked food (for example USDA FoodData Central). Protein, carbs and fat per 100 g are optional but make the report more useful.

## Collecting the labels

Photograph 15 nutrition panels from packets in the cupboard, as you would in the app. Mix them up: some kJ only, some with both kJ and calories, some per serving only, a drink, a curved or shiny packet, one in poor light. Type the per-100 g numbers from the panel into `labels.csv`.

## The two sheets

Put the photos and two CSV files in one folder (for example `G:\My Drive\meal-benchmark\`). Fill them in Google Sheets or Excel and save each as CSV. Templates: [`meals.example.csv`](meals.example.csv) and [`labels.example.csv`](labels.example.csv).

**`meals.csv`**: one row per weighed component. Put the photo's file name and the description on the meal's first row only.

| Column | |
| --- | --- |
| `meal` | Any id, the same on every row of that meal (`m01`) |
| `photo` | Photo file name in the folder, as the phone named it is fine (`PXL_20261128_073012.jpg`) |
| `description` | What you'd say in the app |
| `item` | Component name |
| `grams` | Weighed amount (ml for drinks) |
| `cal_per_100` | Calories per 100 g. kJ works too if you type `kJ` after the number (`1520 kJ`) |
| `protein_per_100`, `carbs_per_100`, `fat_per_100` | Optional, grams per 100 g |
| `calories`, `protein`, `carbs`, `fat` | Instead of the per-100 columns, for a whole packaged item (a 60 g bar: 220 calories) |

**`labels.csv`**: `photo`, `cal_per_100` (or kJ with `kJ`), and optionally `protein_per_100`, `carbs_per_100`, `fat_per_100`.

## Running it

Needs Node 22 or newer and a Gemini API key (the same key the app uses).

```sh
cd benchmark
npm install
GEMINI_API_KEY=your-key npm run bench -- --data "/path/to/meal-benchmark"
```

On Windows PowerShell: `$env:GEMINI_API_KEY="your-key"; npm run bench -- --data "G:\My Drive\meal-benchmark"`.

It shows how many calls it will make and asks before starting (`--yes` skips the question). Answers are saved one by one to `results/answers.jsonl` in the data folder, so if it stops, run it again and it carries on. Failed calls are tried again on the next run.

| Option | Default | |
| --- | --- | --- |
| `--models` | the five above | Comma-separated model ids |
| `--runs` | 2 | Repeats of each call |
| `--conditions` | `photo+voice,photo,voice,label` | Which tests to run |
| `--limit` | all | Only the first N meals and labels, for a quick try |
| `--concurrency` | 3 | Calls at once. Lower it if you hit rate limits |
| `--score-only` | | Re-score saved answers without calling the AI |

**Cost**: 30 meals × 3 ways × 2 runs + 15 labels × 2 runs is 210 calls per model, about 1,000 for five models. Each call is roughly 1,500 tokens in and 1,000 out, so a full run should be a few US dollars at the prices in [`lib/pricing.ts`](lib/pricing.ts). Try `--limit 3` first.

## Reading the results

`results/report.md` has one table per test, and `results/per-answer.csv` has every answer next to its truth for digging into the misses.

- **MAPE**: average miss in calories, as a %. The main number. Under 20% is good for photo estimates; labels should be close to 0%.
- **Bias**: average signed miss. Negative means it under-counts, which is the worse direction for someone cutting.
- **±10% / ±20%**: share of answers that close.
- **Spread**: how much the same meal moves between runs.
- **Protein, carbs, fat**: average grams off.
- **Latency** and **cost per 100 estimates**.

The report suggests a default per test: the lowest MAPE, or a cheaper model if it's within 2 points (only where both prices are known). Treat it as a suggestion and look at bias and spread too.

## Maintenance

- Prices in `lib/pricing.ts` are typed by hand from Google's pricing page. Update them before a run. A model without a price just shows "–".
- The benchmark imports the app's prompt and parser code directly, so a change to either is benchmarked exactly as it ships. Re-run the benchmark after a prompt change to compare against the last report (keep old `results/` folders by renaming them).
- `npm test` at the repo root runs the scoring tests in `__tests__/`. `npm run typecheck` here checks `run.ts`, which the root typecheck skips because it needs `sharp`.
