import { getAnthropicClient } from '@/lib/anthropic';
import { z } from 'zod';

const FlashcardItemSchema = z.object({
  front: z.string().min(1).max(200),
  back: z.string().min(1).max(300),
  hint: z.string().max(200).default(''),
  type: z.enum(['formula', 'definition', 'concept', 'fact']),
});

const FlashcardsArraySchema = z.array(FlashcardItemSchema).min(3).max(10);

export type FlashcardItem = z.infer<typeof FlashcardItemSchema>;

export async function generateFlashcards(params: {
  sectionTitle: string;
  sectionDescription: string;
  learningObjectives: string[];
}): Promise<FlashcardItem[]> {
  const client = getAnthropicClient();

  const prompt = `You are Aryan Sir creating flashcards for a section.

Section: ${params.sectionTitle}
${params.sectionDescription}

Learning objectives:
${params.learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Generate 5–8 flashcards covering the most important formulas, definitions, and concepts.

Return ONLY a valid JSON array (no markdown, no explanation outside JSON):
[
  {
    "front": "Short question or prompt (max 15 words)",
    "back": "Answer in ≤2 lines. Be precise.",
    "hint": "Aryan Sir memory tip — one line, Hinglish ok",
    "type": "formula"
  }
]

Types: "formula" | "definition" | "concept" | "fact"
- front: what you'd write on one side of a flashcard
- back: the answer/explanation
- hint: a sticky way to remember it (e.g. "Think of it like a seesaw")
- type: what kind of knowledge this tests`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in flashcard response');

  const text = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const raw = JSON.parse(text) as unknown;
  return FlashcardsArraySchema.parse(raw);
}
