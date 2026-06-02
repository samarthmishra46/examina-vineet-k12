import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const GameProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    xp: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    streakLastDate: { type: Date, default: null },
    streakFreezes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type GameProfileAttrs = InferSchemaType<typeof GameProfileSchema>;

export const GameProfile: Model<GameProfileAttrs> =
  (models.GameProfile as Model<GameProfileAttrs>) ??
  model<GameProfileAttrs>('GameProfile', GameProfileSchema);
