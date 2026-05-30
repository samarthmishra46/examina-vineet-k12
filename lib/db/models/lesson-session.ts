import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

/**
 * Optional in v1 — populated from Step 7+ to log doubts and replay sessions
 * for debugging. Schema kept flexible because the doubt payload shape may
 * evolve.
 */
const LessonSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    sectionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Section',
    },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date, default: null },
    doubtsAsked: { type: Schema.Types.Mixed, default: [] },
  },
);

export type LessonSessionAttrs = InferSchemaType<typeof LessonSessionSchema>;

export const LessonSession: Model<LessonSessionAttrs> =
  (models.LessonSession as Model<LessonSessionAttrs>) ??
  model<LessonSessionAttrs>('LessonSession', LessonSessionSchema);
