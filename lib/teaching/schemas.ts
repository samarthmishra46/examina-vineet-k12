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
  questions: z.array(GeneratedQuestionSchema).min(5).max(15),
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
