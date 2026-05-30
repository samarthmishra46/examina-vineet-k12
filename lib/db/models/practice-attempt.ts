import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const PracticeAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    questionId: { type: Schema.Types.ObjectId, required: true, ref: 'Question' },
    sectionId: { type: Schema.Types.ObjectId, required: true, ref: 'Section' },
    selectedIndex: { type: Number, required: true, min: 0, max: 3 },
    isCorrect: { type: Boolean, required: true },
    errorType: { type: String, default: null },
    timeTakenSeconds: { type: Number, required: true, min: 0 },
    recoveredCorrectly: { type: Boolean, default: null },
  },
  { timestamps: true },
);

PracticeAttemptSchema.index({ userId: 1, sectionId: 1 });
PracticeAttemptSchema.index({ userId: 1, questionId: 1 });

export type PracticeAttemptAttrs = InferSchemaType<typeof PracticeAttemptSchema>;

export const PracticeAttempt: Model<PracticeAttemptAttrs> =
  (models.PracticeAttempt as Model<PracticeAttemptAttrs>) ??
  model<PracticeAttemptAttrs>('PracticeAttempt', PracticeAttemptSchema);
