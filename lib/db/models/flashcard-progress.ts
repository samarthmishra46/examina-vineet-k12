import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const FlashcardProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    flashcardId: { type: Schema.Types.ObjectId, required: true, ref: 'Flashcard' },
    intervalDays: { type: Number, default: 1 },
    nextReviewAt: { type: Date, default: () => new Date() },
    totalReviews: { type: Number, default: 0 },
    lastRating: {
      type: String,
      enum: ['easy', 'almost', 'confused'],
      default: 'almost',
    },
  },
  { timestamps: true },
);

FlashcardProgressSchema.index({ userId: 1, nextReviewAt: 1 });
FlashcardProgressSchema.index({ userId: 1, flashcardId: 1 }, { unique: true });

export type FlashcardProgressAttrs = InferSchemaType<typeof FlashcardProgressSchema>;

export const FlashcardProgress: Model<FlashcardProgressAttrs> =
  (models.FlashcardProgress as Model<FlashcardProgressAttrs>) ??
  model<FlashcardProgressAttrs>('FlashcardProgress', FlashcardProgressSchema);
