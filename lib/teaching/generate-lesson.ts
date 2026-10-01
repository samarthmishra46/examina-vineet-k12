import type { Command } from './command-schema';
import { LESSON_SYSTEM_PROMPT, LESSON_USER_PROMPT, type LessonPromptParams, type NarrationLanguage } from './prompts';
import { streamCommands } from './stream-commands';

/**
 * Stream lesson commands from Claude.
 * The system prompt (~8 KB, one cached variant per language) is sent with
 * cache_control: ephemeral so Anthropic caches it across requests — only the
 * section-specific user content is re-processed on each call.
 */
export function streamLesson(
  context: LessonPromptParams,
  language: NarrationLanguage = 'english',
): AsyncGenerator<Command> {
  return streamCommands(LESSON_USER_PROMPT(context), {
    systemPrompt: LESSON_SYSTEM_PROMPT(language),
  });
}
