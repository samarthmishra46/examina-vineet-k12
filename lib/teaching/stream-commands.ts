import { getAnthropicClient } from '@/lib/anthropic';
import { CommandSchema, type Command } from './command-schema';

/**
 * Run a prompt against Claude streaming and yield each validated Command as
 * soon as a full NDJSON line arrives. Shared by lesson and doubt generation.
 * Malformed lines are logged and skipped so one bad command doesn't abort
 * the stream.
 *
 * When `systemPrompt` is provided it is sent as a cached system message
 * (Anthropic prompt caching, ~5-min TTL). This eliminates re-processing the
 * 8 KB constant persona + rules on every request.
 */
export async function* streamCommands(
  userContent: string,
  options: { maxTokens?: number; model?: string; systemPrompt?: string } = {},
): AsyncGenerator<Command> {
  const client = getAnthropicClient();

  const system = options.systemPrompt
    ? ([
        {
          type: 'text' as const,
          text: options.systemPrompt,
          cache_control: { type: 'ephemeral' as const },
        },
      ] as Parameters<typeof client.messages.create>[0]['system'])
    : undefined;

  const stream = await client.messages.create(
    {
      model: options.model ?? 'claude-sonnet-4-6',
      max_tokens: options.maxTokens ?? 8192,
      stream: true,
      ...(system && { system }),
      messages: [{ role: 'user', content: userContent }],
    },
    { headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' } },
  );

  let buffer = '';

  for await (const event of stream) {
    if (event.type !== 'content_block_delta' || event.delta.type !== 'text_delta') continue;
    buffer += event.delta.text;
    let idx = buffer.indexOf('\n');
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) {
        const parsed = tryParseCommand(line);
        if (parsed) yield parsed;
      }
      idx = buffer.indexOf('\n');
    }
  }

  const trailing = buffer.trim();
  if (trailing.length > 0) {
    const parsed = tryParseCommand(trailing);
    if (parsed) yield parsed;
  }
}

function tryParseCommand(line: string): Command | null {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    // Claude occasionally omits `id`. The id is only used internally for
    // `highlight` to refer back to earlier elements, so auto-fill is safe.
    if (obj && typeof obj === 'object' && typeof obj.type === 'string' && !('id' in obj)) {
      obj.id = `auto-${Math.random().toString(36).slice(2, 10)}`;
    }
    return CommandSchema.parse(obj);
  } catch (err) {
    console.warn('[stream] dropped malformed line:', line.slice(0, 200), err);
    return null;
  }
}
