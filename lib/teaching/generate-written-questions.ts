import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic';
import { WRITTEN_QUESTION_GENERATION_PROMPT, type QuestionPromptParams } from './prompts';
import { GeneratedWrittenQuestionsSchema, type GeneratedWrittenQuestion } from './schemas';

const writtenTool: Anthropic.Tool = {
  name: 'submit_written_questions',
  description: 'Submit the written board-style questions for this section.',
  input_schema: {
    type: 'object',
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        minItems: 3,
        maxItems: 8,
        items: {
          type: 'object',
          required: [
            'text',
            'type',
            'marks',
            'difficulty',
            'solution',
            'markingScheme',
            'conceptTags',
            'timeExpectedSeconds',
          ],
          properties: {
            text: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['short', 'long'] },
            marks: { type: 'integer', minimum: 2, maximum: 5 },
            difficulty: { type: 'integer', minimum: 1, maximum: 3 },
            solution: { type: 'string', minLength: 1 },
            markingScheme: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8 },
            conceptTags: { type: 'array', items: { type: 'string' }, minItems: 1 },
            timeExpectedSeconds: { type: 'integer', minimum: 60, maximum: 900 },
          },
        },
      },
    },
  },
};

export async function generateWrittenQuestions(
  params: QuestionPromptParams,
): Promise<GeneratedWrittenQuestion[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools: [writtenTool],
    tool_choice: { type: 'tool', name: 'submit_written_questions' },
    messages: [{ role: 'user', content: WRITTEN_QUESTION_GENERATION_PROMPT(params) }],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call the submit_written_questions tool');
  }

  return GeneratedWrittenQuestionsSchema.parse(toolBlock.input).questions;
}
