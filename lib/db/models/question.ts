import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const QuestionSchema = new Schema(
  {
    sectionId: { type: Schema.Types.ObjectId, required: true, ref: 'Section' },
    chapterId: { type: Schema.Types.ObjectId, required: true, ref: 'Chapter' },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ['mcq'], default: 'mcq' },
    difficulty: { type: Number, enum: [1, 2, 3], required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    solution: { type: String, required: true },
    conceptTags: { type: [String], default: [] },
    commonMistakeTags: { type: [String], default: [] },
    timeExpectedSeconds: { type: Number, default: 60 },
    flagCount: { type: Number, default: 0 },
    flagSuspended: { type: Boolean, default: false },
  },
  { timestamps: true },
);

QuestionSchema.index({ sectionId: 1, difficulty: 1 });

export type QuestionAttrs = InferSchemaType<typeof QuestionSchema>;

export const Question: Model<QuestionAttrs> =
  (models.Question as Model<QuestionAttrs>) ?? model<QuestionAttrs>('Question', QuestionSchema);
