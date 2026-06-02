import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const FlashcardSchema = new Schema(
  {
    sectionId: { type: Schema.Types.ObjectId, required: true, ref: 'Section' },
    chapterId: { type: Schema.Types.ObjectId, required: true, ref: 'Chapter' },
    front: { type: String, required: true },
    back: { type: String, required: true },
    hint: { type: String, default: '' },
    type: {
      type: String,
      enum: ['formula', 'definition', 'concept', 'fact'],
      default: 'concept',
    },
  },
  { timestamps: true },
);

FlashcardSchema.index({ sectionId: 1 });

export type FlashcardAttrs = InferSchemaType<typeof FlashcardSchema>;

export const Flashcard: Model<FlashcardAttrs> =
  (models.Flashcard as Model<FlashcardAttrs>) ??
  model<FlashcardAttrs>('Flashcard', FlashcardSchema);
