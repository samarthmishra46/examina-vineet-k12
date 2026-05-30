import { z } from 'zod';

/**
 * Whiteboard command schema. Each command is one JSON object emitted by Claude
 * on its own line. The discriminated union narrows by `type` for safe handling.
 *
 * Shape commands accept optional `color` (stroke), `fill` (closed shapes only),
 * and `strokeWidth` (1–6 px). Defaults are applied at render time.
 */

const id = z.string().min(1).max(64);
const color = z.string().min(1).max(32).optional();
const fill = z.string().min(1).max(32).optional();
const strokeWidth = z.number().int().min(1).max(6).optional();

export const NarrateSchema = z.object({
  type: z.literal('narrate'),
  id,
  text: z.string().min(1).max(500),
});

export const DrawTextSchema = z.object({
  type: z.literal('draw_text'),
  id,
  x: z.number(),
  y: z.number(),
  text: z.string().min(1).max(500),
  fontSize: z.number().int().min(8).max(120),
  color,
});

export const DrawEquationSchema = z.object({
  type: z.literal('draw_equation'),
  id,
  x: z.number(),
  y: z.number(),
  latex: z.string().min(1).max(500),
  fontSize: z.number().int().min(8).max(120),
});

export const DrawArrowSchema = z.object({
  type: z.literal('draw_arrow'),
  id,
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  color,
  strokeWidth,
});

export const DrawLineSchema = z.object({
  type: z.literal('draw_line'),
  id,
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  color,
  strokeWidth,
});

export const DrawRectangleSchema = z.object({
  type: z.literal('draw_rectangle'),
  id,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color,
  fill,
  strokeWidth,
});

export const DrawEllipseSchema = z.object({
  type: z.literal('draw_ellipse'),
  id,
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color,
  fill,
  strokeWidth,
});

export const DrawFreehandSchema = z.object({
  type: z.literal('draw_freehand'),
  id,
  // At least 2 points to form a path. Each point is [x, y].
  points: z.array(z.tuple([z.number(), z.number()])).min(2).max(200),
  color,
  strokeWidth,
});

export const HighlightSchema = z.object({
  type: z.literal('highlight'),
  targetId: id,
  color,
});

export const ClearBoardSchema = z.object({
  type: z.literal('clear_board'),
});

export const PauseForDoubtsSchema = z.object({
  type: z.literal('pause_for_doubts'),
  prompt: z.string().min(1).max(200),
});

export const EndLessonSchema = z.object({
  type: z.literal('end_lesson'),
});

export const QuickCheckQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().min(1).max(400),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(300),
});

export const QuickCheckSchema = z.object({
  type: z.literal('quick_check'),
  questions: z.array(QuickCheckQuestionSchema).min(2).max(3),
});

export const CommandSchema = z.discriminatedUnion('type', [
  NarrateSchema,
  DrawTextSchema,
  DrawEquationSchema,
  DrawArrowSchema,
  DrawLineSchema,
  DrawRectangleSchema,
  DrawEllipseSchema,
  DrawFreehandSchema,
  HighlightSchema,
  ClearBoardSchema,
  PauseForDoubtsSchema,
  QuickCheckSchema,
  EndLessonSchema,
]);

export type Command = z.infer<typeof CommandSchema>;
export type NarrateCommand = z.infer<typeof NarrateSchema>;
export type DrawTextCommand = z.infer<typeof DrawTextSchema>;
export type DrawEquationCommand = z.infer<typeof DrawEquationSchema>;
export type DrawArrowCommand = z.infer<typeof DrawArrowSchema>;
export type DrawLineCommand = z.infer<typeof DrawLineSchema>;
export type DrawRectangleCommand = z.infer<typeof DrawRectangleSchema>;
export type DrawEllipseCommand = z.infer<typeof DrawEllipseSchema>;
export type DrawFreehandCommand = z.infer<typeof DrawFreehandSchema>;
export type HighlightCommand = z.infer<typeof HighlightSchema>;
export type PauseForDoubtsCommand = z.infer<typeof PauseForDoubtsSchema>;
export type QuickCheckQuestion = z.infer<typeof QuickCheckQuestionSchema>;
export type QuickCheckCommand = z.infer<typeof QuickCheckSchema>;
