import { z } from 'zod';

export const RoadmapSectionSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  learningObjectives: z.array(z.string().min(1)).min(1).max(8),
  estimatedMinutes: z.number().int().min(2).max(20),
});
export type RoadmapSection = z.infer<typeof RoadmapSectionSchema>;

export const RoadmapSchema = z.object({
  sections: z.array(RoadmapSectionSchema).min(3).max(15),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;

export const GeneratedQuestionSchema = z.object({
  text: z.string().min(1).max(600),
  options: z.array(z.string().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  solution: z.string().min(1).max(800),
  conceptTags: z.array(z.string().min(1)).min(1).max(4),
  commonMistakeTags: z.array(z.string().min(1)).min(1).max(3),
  timeExpectedSeconds: z.number().int().min(20).max(180),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const GeneratedQuestionsSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(4).max(8),
});

export const DiagnosisSchema = z.object({
  errorType: z.enum([
    'CONCEPT_GAP',
    'FORMULA_WRONG',
    'SIGN_ERROR',
    'CALCULATION_ERROR',
    'MISREAD_QUESTION',
    'NEAR_MISS',
  ]),
  errorLabel: z.string().min(1).max(40),
  explanation: z.string().min(1).max(600),
  memoryHook: z.string().min(1).max(200),
  microQuestion: z.object({
    text: z.string().min(1).max(400),
    options: z.array(z.string().min(1).max(200)).length(4),
    correctIndex: z.number().int().min(0).max(3),
  }),
});
export type DiagnosisResult = z.infer<typeof DiagnosisSchema>;

export const GeneratedWrittenQuestionSchema = z.object({
  text: z.string().min(1).max(800),
  type: z.enum(['short', 'long']),
  marks: z.number().int().min(2).max(5),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  solution: z.string().min(1).max(1500),
  markingScheme: z.array(z.string().min(1).max(300)).min(2).max(8),
  conceptTags: z.array(z.string().min(1)).min(1).max(4),
  timeExpectedSeconds: z.number().int().min(60).max(900),
});
export type GeneratedWrittenQuestion = z.infer<typeof GeneratedWrittenQuestionSchema>;

export const GeneratedWrittenQuestionsSchema = z.object({
  questions: z.array(GeneratedWrittenQuestionSchema).min(3).max(8),
});

export const GradeResultSchema = z.object({
  marksAwarded: z.number().min(0).max(6),
  pointsEarned: z.array(z.string().max(300)),
  pointsMissed: z.array(z.string().max(300)),
  feedback: z.string().min(1).max(800),
});
export type GradeResult = z.infer<typeof GradeResultSchema>;

export const ExtractedPaperQuestionSchema = z.object({
  questionNo: z.number().int().min(1).max(200),
  type: z.enum(['mcq', 'assertion_reason', 'case_based', 'short', 'long']),
  marks: z.number().int().min(1).max(6),
  context: z.string().max(3000).default(''),
  text: z.string().min(1).max(3000),
  options: z.array(z.string().max(400)).max(4).default([]),
  correctIndex: z.number().int().min(0).max(3).nullable().default(null),
  solution: z.string().max(3000).default(''),
  markingScheme: z.array(z.string().max(400)).max(10).default([]),
  conceptTags: z.array(z.string()).max(4).default([]),
  sectionId: z.string().nullable().default(null),
  hasFigure: z.boolean().default(false),
  answerFromKey: z.boolean().default(false),
});
export type ExtractedPaperQuestion = z.infer<typeof ExtractedPaperQuestionSchema>;

export const ExtractedPaperSchema = z.object({
  questions: z.array(ExtractedPaperQuestionSchema).min(1).max(80),
});
