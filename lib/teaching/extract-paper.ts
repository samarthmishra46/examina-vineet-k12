import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '@/lib/anthropic';
import { PAPER_EXTRACTION_PROMPT, type PaperExtractionPromptParams } from './prompts';
import { ExtractedPaperSchema, type ExtractedPaperQuestion } from './schemas';

const extractTool: Anthropic.Tool = {
  name: 'submit_paper_questions',
  description: 'Submit every question extracted from the paper.',
  input_schema: {
    type: 'object',
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['questionNo', 'type', 'marks', 'text'],
          properties: {
            questionNo: { type: 'integer' },
            type: {
              type: 'string',
              enum: ['mcq', 'assertion_reason', 'case_based', 'short', 'long'],
            },
            marks: { type: 'integer' },
            context: { type: 'string' },
            text: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correctIndex: { type: ['integer', 'null'] },
            solution: { type: 'string' },
            markingScheme: { type: 'array', items: { type: 'string' } },
            conceptTags: { type: 'array', items: { type: 'string' } },
            sectionId: { type: ['string', 'null'] },
            hasFigure: { type: 'boolean' },
            answerFromKey: { type: 'boolean' },
          },
        },
      },
    },
  },
};

function pdfBlock(buffer: Buffer): Anthropic.DocumentBlockParam {
  return {
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
  };
}

/**
 * Digitise a board paper PDF (optionally with its answer key) into structured questions.
 * The PDF goes to Claude as a document block so scanned pages, equations and tables are read
 * visually instead of through lossy text extraction. Output is Zod-validated and section ids
 * are checked against the ids we supplied.
 */
export async function extractPaperQuestions(
  paper: Buffer,
  answerKey: Buffer | null,
  params: PaperExtractionPromptParams,
): Promise<ExtractedPaperQuestion[]> {
  const client = getAnthropicClient();

  const content: Anthropic.ContentBlockParam[] = [pdfBlock(paper)];
  if (answerKey) content.push(pdfBlock(answerKey));
  content.push({ type: 'text', text: PAPER_EXTRACTION_PROMPT(params) });

  // Streamed: a full paper's output is large enough that a plain request risks timing out.
  const message = await client.messages
    .stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 32000,
      tools: [extractTool],
      tool_choice: { type: 'tool', name: 'submit_paper_questions' },
      messages: [{ role: 'user', content }],
    })
    .finalMessage();

  const toolBlock = message.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Claude did not call the submit_paper_questions tool');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('Paper too long to extract in one pass — split it into parts.');
  }

  const validIds = new Set(params.sections.map((s) => s.id));
  return ExtractedPaperSchema.parse(toolBlock.input).questions.map((q) => ({
    ...q,
    sectionId: q.sectionId && validIds.has(q.sectionId) ? q.sectionId : null,
  }));
}
