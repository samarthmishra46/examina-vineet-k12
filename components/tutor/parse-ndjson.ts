import { CommandSchema, type Command } from '@/lib/teaching/command-schema';

/**
 * Read a ReadableStream of NDJSON bytes and yield validated Commands one at
 * a time. Defensive Zod parse — the server already validated, but we double
 * check in case middleware mangled bytes.
 */
export async function* parseNdjsonStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Command> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf('\n');
      while (idx !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line.length > 0) {
          const parsed = tryParse(line);
          if (parsed) yield parsed;
        }
        idx = buffer.indexOf('\n');
      }
    }
    const trailing = buffer.trim();
    if (trailing.length > 0) {
      const parsed = tryParse(trailing);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

function tryParse(line: string): Command | null {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    if (obj && typeof obj === 'object' && typeof obj.type === 'string' && !('id' in obj)) {
      obj.id = `auto-${Math.random().toString(36).slice(2, 10)}`;
    }
    return CommandSchema.parse(obj);
  } catch (err) {
    console.warn('[lesson] dropped client-side line:', line.slice(0, 200), err);
    return null;
  }
}
