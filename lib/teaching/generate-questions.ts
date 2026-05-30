import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic';
import { QUESTION_GENERATION_PROMPT, type QuestionPromptParams } from './prompts';
import { GeneratedQuestionsSchema, type GeneratedQuestion } from './schemas';

const questionsTool: Anthropic.Tool = {
  name: 'submit_questions',
  description: 'Submit the generated practice questions for this section.',
  input_schema: {
    type: 'object',
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        minItems: 5,
        maxItems: 15,
        items: {
          type: 'object',
          required: [
            'text',
            'options',
            'correctIndex',
            'difficulty',
            'solution',
            'conceptTags',
            'commonMistakeTags',
            'timeExpectedSeconds',
          ],
          properties: {
            text: { type: 'string', minLength: 1 },
            options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
            correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
            difficulty: { type: 'integer', minimum: 1, maximum: 3 },
            solution: { type: 'string', minLength: 1 },
            conceptTags: { type: 'array', items: { type: 'string' }, minItems: 1 },
            commonMistakeTags: { type: 'array', items: { type: 'string' }, minItems: 1 },
            timeExpectedSeconds: { type: 'integer', minimum: 20, maximum: 180 },
          },
        },
      },
    },
  },
};

export async function generateQuestions(params: QuestionPromptParams): Promise<GeneratedQuestion[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools: [questionsTool],
    tool_choice: { type: 'tool', name: 'submit_questions' },
    messages: [{ role: 'user', content: QUESTION_GENERATION_PROMPT(params) }],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call the submit_questions tool');
  }

  const parsed = GeneratedQuestionsSchema.parse(toolBlock.input);
  return parsed.questions;
}
