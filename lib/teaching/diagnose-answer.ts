import { getAnthropicClient } from '@/lib/anthropic';
import { DIAGNOSIS_PROMPT, type DiagnosisPromptParams } from './prompts';
import { DiagnosisSchema, type DiagnosisResult } from './schemas';

/**
 * Ask Claude to diagnose exactly why a student got a question wrong,
 * classify the error type, and produce a recovery micro-question.
 * Uses non-streaming JSON — diagnosis is fast (~2–4s) and the structured
 * output matters more than streaming here.
 */
export async function diagnoseAnswer(params: DiagnosisPromptParams): Promise<DiagnosisResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: DIAGNOSIS_PROMPT(params) }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text in diagnosis');
  }

  const text = textBlock.text.trim();

  // Claude occasionally wraps JSON in markdown fences — strip them.
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Diagnosis JSON parse failed: ${jsonText.slice(0, 200)}`);
  }

  return DiagnosisSchema.parse(parsed);
}
