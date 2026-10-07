import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic';
import { DIAGNOSIS_PROMPT, type DiagnosisPromptParams } from './prompts';
import { DiagnosisSchema, type DiagnosisResult } from './schemas';

const diagnosisTool: Anthropic.Tool = {
  name: 'submit_diagnosis',
  description: 'Submit the diagnosis of why the student answered incorrectly.',
  input_schema: {
    type: 'object',
    required: ['errorType', 'errorLabel', 'explanation', 'memoryHook', 'microQuestion'],
    properties: {
      errorType: {
        type: 'string',
        enum: [
          'CONCEPT_GAP',
          'FORMULA_WRONG',
          'SIGN_ERROR',
          'CALCULATION_ERROR',
          'MISREAD_QUESTION',
          'NEAR_MISS',
        ],
      },
      errorLabel: { type: 'string', maxLength: 40 },
      explanation: { type: 'string', maxLength: 600 },
      memoryHook: { type: 'string', maxLength: 200 },
      microQuestion: {
        type: 'object',
        required: ['text', 'options', 'correctIndex'],
        properties: {
          text: { type: 'string', maxLength: 400 },
          options: { type: 'array', items: { type: 'string', maxLength: 200 }, minItems: 4, maxItems: 4 },
          correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
        },
      },
    },
  },
};

/**
 * Ask Claude to diagnose exactly why a student got a question wrong,
 * classify the error type, and produce a recovery micro-question.
 * Forced tool use gives structured output without parsing free-text JSON.
 */
export async function diagnoseAnswer(params: DiagnosisPromptParams): Promise<DiagnosisResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [diagnosisTool],
    tool_choice: { type: 'tool', name: 'submit_diagnosis' },
    messages: [{ role: 'user', content: DIAGNOSIS_PROMPT(params) }],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call the submit_diagnosis tool');
  }

  return DiagnosisSchema.parse(toolBlock.input);
}
