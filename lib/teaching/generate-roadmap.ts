import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic';
import { ROADMAP_GENERATION_PROMPT } from './prompts';
import { RoadmapSchema, type RoadmapSection } from './schemas';

const roadmapTool: Anthropic.Tool = {
  name: 'submit_roadmap',
  description: 'Submit the section-by-section roadmap for the given chapter.',
  input_schema: {
    type: 'object',
    properties: {
      sections: {
        type: 'array',
        minItems: 3,
        maxItems: 15,
        items: {
          type: 'object',
          required: ['order', 'title', 'description', 'learningObjectives', 'estimatedMinutes'],
          properties: {
            order: { type: 'integer', minimum: 1 },
            title: { type: 'string', minLength: 1, maxLength: 120 },
            description: { type: 'string', minLength: 1, maxLength: 500 },
            learningObjectives: {
              type: 'array',
              minItems: 1,
              maxItems: 8,
              items: { type: 'string', minLength: 1 },
            },
            estimatedMinutes: { type: 'integer', minimum: 2, maximum: 20 },
          },
        },
      },
    },
    required: ['sections'],
  },
};

/**
 * Ask Claude to break a chapter's source text into 5–10 teachable sections.
 * Forces tool use to get structured output — no JSON parsing of free text.
 * Output is Zod-validated before returning; throws on any deviation.
 */
export async function generateRoadmap(chapterText: string): Promise<RoadmapSection[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [roadmapTool],
    tool_choice: { type: 'tool', name: 'submit_roadmap' },
    messages: [{ role: 'user', content: ROADMAP_GENERATION_PROMPT(chapterText) }],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call the submit_roadmap tool');
  }

  const parsed = RoadmapSchema.parse(toolBlock.input);
  return parsed.sections;
}
