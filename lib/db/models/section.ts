import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const SectionSchema = new Schema(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Chapter',
    },
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    learningObjectives: { type: [String], default: [] },
    estimatedMinutes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Roadmap query: list a chapter's sections in order.
SectionSchema.index({ chapterId: 1, order: 1 });

export type SectionAttrs = InferSchemaType<typeof SectionSchema>;

export const Section: Model<SectionAttrs> =
  (models.Section as Model<SectionAttrs>) ?? model<SectionAttrs>('Section', SectionSchema);
