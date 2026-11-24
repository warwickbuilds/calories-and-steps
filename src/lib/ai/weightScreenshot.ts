/**
 * Reads date and weight rows from a screenshot of another app's weight
 * history (Lose It!, MyFitnessPal, a smart-scale app, a spreadsheet...).
 */

import type { AiJsonRequest } from './providers';

export const WEIGHT_SCREENSHOT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows'],
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['year', 'month', 'day', 'weight', 'unit', 'source'],
        properties: {
          year: { type: ['integer', 'null'], description: 'Four-digit year, or null if the screenshot does not show it' },
          month: { type: 'integer', description: '1 to 12' },
          day: { type: 'integer', description: '1 to 31' },
          weight: { type: 'number' },
          unit: { type: 'string', enum: ['kg', 'lb'] },
          source: { type: 'string', enum: ['list', 'chart'] },
        },
      },
    },
  },
} as const;

export const WEIGHT_SCREENSHOT_PROMPT = `This is a screenshot from a weight-tracking app. Extract every body-weight entry it shows.

Rules:
- Each row of a list or table of entries (a date next to a weight) is one entry with source "list". Copy the weight exactly as written. Include every row, even if it is partly cut off at the top or bottom, as long as both the date and the weight are fully readable.
- Use the year written on the row. If no year is shown anywhere for that row, set year to null. Never guess a year.
- Read dates carefully. Month names are unambiguous; for numeric dates like 03/04, use the other rows and the app's language to decide whether it is day/month or month/day.
- Units: "kg" for kilograms, "lb" for pounds. If a weight is shown in stones and pounds (for example "12 st 3 lb"), convert it to total pounds (171) and use "lb". If no unit is shown, use the unit shown elsewhere on the screen.
- Only if the screenshot has a chart and no list rows: estimate up to 12 key points from the chart (the first and last points, and clear turning points), with source "chart". Use the axis labels to estimate the date and weight. If the chart's dates cannot be worked out, return no chart points.
- Ignore goal weights, targets, averages, totals, BMI, body fat and anything that is not a dated body-weight reading.
- If the image is not a weight history, return an empty rows list.`;

export function weightScreenshotRequest(image: { base64: string; mimeType: 'image/jpeg' | 'image/png' }): AiJsonRequest {
  return {
    prompt: WEIGHT_SCREENSHOT_PROMPT,
    images: [image],
    schema: WEIGHT_SCREENSHOT_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'weight_entries',
    maxOutputTokens: 8000,
  };
}
