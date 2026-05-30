import type { Command } from './command-schema';
import { LESSON_GENERATION_PROMPT, type LessonPromptParams } from './prompts';
import { streamCommands } from './stream-commands';

/**
 * Stream lesson commands from Claude.
 */
export function streamLesson(context: LessonPromptParams): AsyncGenerator<Command> {
  return streamCommands(LESSON_GENERATION_PROMPT(context));
}
