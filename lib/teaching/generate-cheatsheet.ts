import { getAnthropicClient } from '@/lib/anthropic';
import { z } from 'zod';

export const CheatCardSchema = z.object({
  category: z.string(),
  title: z.string(),
  content: z.string(),
  note: z.string().nullable().default(null),
});

export const CheatCardsSchema = z.array(CheatCardSchema).min(4).max(30);
export type CheatCard = z.infer<typeof CheatCardSchema>;

export async function generateCheatSheet(params: {
  chapterTitle: string;
  chapterDescription: string;
  sectionsText: string; // all section titles + objectives concatenated
}): Promise<CheatCard[]> {
  const client = getAnthropicClient();

  const prompt = `You are Aryan Sir creating a one-page cheat sheet for a chapter.

Chapter: ${params.chapterTitle}
${params.chapterDescription}

Sections covered:
${params.sectionsText}

Generate 10–20 cheat sheet cards covering ALL key formulas, definitions, rules, and facts from this chapter.

Return ONLY a valid JSON array (no markdown, no text outside the array):
[
  {
    "category": "Formula",
    "title": "Short name of the formula/concept",
    "content": "The formula or definition itself — precise and complete",
    "note": "One-line memory tip or when to use it (or null)"
  }
]

Categories to use: "Formula", "Definition", "Key Rule", "Quick Fact", "Common Mistake"

Rules:
- Every important formula must be included
- Definitions must be crisp and accurate (board-exam standard)
- Notes are Aryan Sir's memory tips — keep them short and memorable
- Cover every section of the chapter
- No fluff — only things a student would actually write on a cheat sheet`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in cheat sheet response');

  const text = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const raw = JSON.parse(text) as unknown;
  return CheatCardsSchema.parse(raw);
}
