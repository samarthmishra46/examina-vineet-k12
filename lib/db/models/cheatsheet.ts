import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const CheatSheetSchema = new Schema(
  {
    chapterId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'Chapter' },
    cards: { type: Schema.Types.Mixed, required: true }, // JSON array of cards
  },
  { timestamps: true },
);

export type CheatSheetAttrs = InferSchemaType<typeof CheatSheetSchema>;

export const CheatSheet: Model<CheatSheetAttrs> =
  (models.CheatSheet as Model<CheatSheetAttrs>) ??
  model<CheatSheetAttrs>('CheatSheet', CheatSheetSchema);
