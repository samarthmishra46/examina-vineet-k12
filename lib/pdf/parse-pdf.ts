// Import the inner module directly to skip pdf-parse's index.js debug code,
// which tries to read a test PDF at module-load time and breaks in bundled
// environments. The function signature is the same.
import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extract text from a PDF buffer. Server-only (Node runtime).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text.trim();
}
