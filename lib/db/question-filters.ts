/**
 * Filters for student-facing readers of the Question collection.
 * Written questions (short/long) have no options, and imported past-paper questions stay
 * 'pending' until an admin publishes them, so MCQ-only features must exclude both.
 * Legacy questions have neither field set and still match.
 */
export const WRITTEN_QUESTION_TYPES: ('short' | 'long')[] = ['short', 'long'];
export const PAPER_SOURCES: ('pyq' | 'sample_paper')[] = ['pyq', 'sample_paper'];

export const OBJECTIVE_VISIBLE = {
  type: { $nin: WRITTEN_QUESTION_TYPES },
  reviewStatus: { $ne: 'pending' as const },
};
