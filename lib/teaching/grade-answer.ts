import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic';
import { GRADING_PROMPT, type GradePromptParams } from './prompts';
import { GradeResultSchema, type GradeResult } from './schemas';

const gradeTool: Anthropic.Tool = {
  name: 'submit_grade',
  description: "Submit the marks and feedback for the student's written answer.",
  input_schema: {
    type: 'object',
    required: ['marksAwarded', 'pointsEarned', 'pointsMissed', 'feedback'],
    properties: {
      marksAwarded: { type: 'number', minimum: 0, maximum: 6 },
      pointsEarned: { type: 'array', items: { type: 'string' } },
      pointsMissed: { type: 'array', items: { type: 'string' } },
      feedback: { type: 'string' },
    },
  },
};

/** Grade a written answer against the question's marking scheme. Marks are clamped to [0, max]. */
export async function gradeAnswer(params: GradePromptParams): Promise<GradeResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [gradeTool],
    tool_choice: { type: 'tool', name: 'submit_grade' },
    messages: [{ role: 'user', content: GRADING_PROMPT(params) }],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call the submit_grade tool');
  }

  const result = GradeResultSchema.parse(toolBlock.input);
  const clamped = Math.min(Math.max(result.marksAwarded, 0), params.marks);
  return { ...result, marksAwarded: Math.round(clamped * 2) / 2 };
}
